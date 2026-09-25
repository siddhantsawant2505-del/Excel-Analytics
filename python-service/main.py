import os
import json
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import google.generativeai as genai

# Load environment variables
# Look for env in server directory first, then root, then local env
env_paths = [
    os.path.join(os.path.dirname(__file__), "..", "server", ".env"),
    os.path.join(os.path.dirname(__file__), ".env"),
    os.path.join(os.path.dirname(__file__), "..", ".env")
]
for path in env_paths:
    if os.path.exists(path):
        load_dotenv(path)
        break

# Configure Gemini API Key
api_key = os.environ.get("GEMINI_API_KEY")
if not api_key:
    print("WARNING: GEMINI_API_KEY environment variable not found.")
else:
    genai.configure(api_key=api_key)

app = FastAPI(title="Excel Analytics Python Service", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class FilePathPayload(BaseModel):
    file_path: str

class NLPQueryPayload(BaseModel):
    file_path: str
    query: str

def safe_load_excel(file_path: str) -> pd.DataFrame:
    """Loads an excel file safely using pandas."""
    # Resolve relative path to absolute
    abs_path = os.path.abspath(file_path)
    if not os.path.exists(abs_path):
        # Check relative to root
        root_relative = os.path.join(os.path.dirname(__file__), "..", file_path)
        if os.path.exists(root_relative):
            abs_path = os.path.abspath(root_relative)
        else:
            raise HTTPException(status_code=404, detail=f"File not found: {file_path}")
    
    try:
        # Load first sheet
        df = pd.read_excel(abs_path)
        # Convert column names to strings and strip whitespace
        df.columns = [str(col).strip() for col in df.columns]
        return df
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read Excel file: {str(e)}")

def execute_pandas_spec(df: pd.DataFrame, spec: dict) -> pd.DataFrame:
    """Executes a structured query spec on a pandas DataFrame safely."""
    res_df = df.copy()
    
    # 1. Filter
    filter_col = spec.get('filterColumn')
    filter_op = spec.get('filterOperator')
    filter_val = spec.get('filterValue')
    
    if filter_col and filter_op and filter_val is not None:
        if filter_col in res_df.columns:
            try:
                if filter_op == '==':
                    res_df = res_df[res_df[filter_col] == filter_val]
                elif filter_op == '>':
                    res_df = res_df[res_df[filter_col] > float(filter_val)]
                elif filter_op == '<':
                    res_df = res_df[res_df[filter_col] < float(filter_val)]
                elif filter_op == '!=':
                    res_df = res_df[res_df[filter_col] != filter_val]
                elif filter_op == 'in' and isinstance(filter_val, list):
                    res_df = res_df[res_df[filter_col].isin(filter_val)]
            except Exception as e:
                print(f"Error applying filter: {e}")

    # 2. Group by and aggregate
    group_by = spec.get('groupBy')
    agg_col = spec.get('aggColumn')
    agg_func = spec.get('aggFunc')
    
    if group_by and agg_col and agg_func:
        if group_by in res_df.columns and agg_col in res_df.columns:
            try:
                # Ensure agg_col is numeric if calculating sum/mean
                if agg_func in ['sum', 'mean']:
                    res_df[agg_col] = pd.to_numeric(res_df[agg_col], errors='coerce')
                
                # Group and aggregate
                res_df = res_df.groupby(group_by)[agg_col].agg(agg_func).reset_index()
            except Exception as e:
                print(f"Error grouping/aggregating: {e}")
    elif agg_col and agg_func:
        # Global aggregation without grouping
        try:
            if agg_col in res_df.columns:
                if agg_func in ['sum', 'mean']:
                    res_df[agg_col] = pd.to_numeric(res_df[agg_col], errors='coerce')
                val = res_df[agg_col].agg(agg_func)
                res_df = pd.DataFrame([{"Metric": f"{agg_func.capitalize()} of {agg_col}", "Value": val}])
        except Exception as e:
            print(f"Error global aggregation: {e}")

    # 3. Sort
    sort_by = spec.get('sortBy')
    if sort_by and sort_by in res_df.columns:
        ascending = spec.get('ascending', True)
        res_df = res_df.sort_values(by=sort_by, ascending=ascending)
        
    # 4. Limit
    limit = spec.get('limit')
    if limit:
        try:
            res_df = res_df.head(int(limit))
        except ValueError:
            pass
            
    return res_df

@app.get("/health")
def health_check():
    return {"status": "OK", "service": "Python Excel Analytics Service"}

@app.post("/auto-insights")
def auto_insights(payload: FilePathPayload):
    if not api_key:
        raise HTTPException(status_code=500, detail="Gemini API Key is not configured on the Python service.")
        
    df = safe_load_excel(payload.file_path)
    
    # Calculate basic dataset metadata
    shape = df.shape
    columns = list(df.columns)
    dtypes = {col: str(df[col].dtype) for col in df.columns}
    missing_counts = df.isnull().sum().to_dict()
    
    # Generate stats summary
    desc_df = df.describe(include='all').fillna('')
    desc_dict = desc_df.to_dict()
    
    # Sample data (up to 10 rows)
    sample_rows = df.head(10).fillna('').to_dict(orient='records')
    
    prompt = f"""
    You are an expert data analyst and business intelligence consultant. 
    Analyze this spreadsheet metadata and write a comprehensive, professional summary and anomalies/trends report.

    Spreadsheet Info:
    - Dimensions: {shape[0]} rows, {shape[1]} columns.
    - Columns: {columns}
    - Data Types: {json.dumps(dtypes)}
    - Missing Values per Column: {json.dumps(missing_counts)}
    - Summary Statistics: {json.dumps(desc_dict)}
    - Sample Data (First 10 rows): {json.dumps(sample_rows)}

    Deliver a JSON response with exactly two keys:
    1. "autoInsights": A markdown formatted string containing:
       - **Dataset Summary**: An executive summary explaining what the dataset contains, its quality, and its primary purpose.
       - **Key Trends & Observations**: 3 to 4 non-obvious, high-value data insights, trends, or potential anomalies found in the sample rows and summary statistics. Highlight extreme values, distributions, or correlation indicators.
    2. "suggestedQueries": A list of exactly 3 distinct, plain-English questions a user might ask to query this specific dataset (e.g., "What are the total sales by customer segment?", "Show monthly profit trends as a line chart"). Ensure the columns referenced match existing ones in the column list.

    Ensure the response is valid, parsable JSON. Do not include markdown code block syntax (like ```json) in the raw HTTP output if possible, just return raw valid JSON. If you must use code blocks, ensure they are formatted perfectly.
    """
    
    try:
        model = genai.getGenerativeModel('gemini-1.5-flash', generation_config={"response_mime_type": "application/json"})
        response = model.generate_content(prompt)
        response_data = json.loads(response.text)
        return response_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate auto-insights: {str(e)}")

@app.post("/nlp-query")
def nlp_query(payload: NLPQueryPayload):
    if not api_key:
        raise HTTPException(status_code=500, detail="Gemini API Key is not configured on the Python service.")
        
    df = safe_load_excel(payload.file_path)
    
    # Gather column information
    columns = list(df.columns)
    dtypes = {col: str(df[col].dtype) for col in df.columns}
    sample_rows = df.head(10).fillna('').to_dict(orient='records')
    
    # STEP 1: Generate pandas aggregation/filter spec and chart configuration
    spec_prompt = f"""
    You are a data compiler. You receive a user's natural language question and a dataset schema.
    Your task is to output a JSON specification describing how to slice/group/aggregate the dataset to answer the question, and how to plot it.

    Columns: {columns}
    Data Types: {json.dumps(dtypes)}
    Sample Data (First 10 rows): {json.dumps(sample_rows)}
    User Query: "{payload.query}"

    Available options for the "pandas_operation" JSON block:
    - "groupBy": Column name to group by (e.g. "Region") [Optional]
    - "aggColumn": Column name to aggregate (e.g. "Sales") [Optional]
    - "aggFunc": Aggregation function name: "sum", "mean", "count", "min", "max" [Optional]
    - "filterColumn": Column to filter on [Optional]
    - "filterOperator": Operator "==", ">", "<", "!=", "in" [Optional]
    - "filterValue": Single value or list of values to filter by [Optional]
    - "sortBy": Column name to sort by [Optional]
    - "ascending": boolean (true/false) [Optional]
    - "limit": Integer row limit (e.g. 15 for readable charts) [Optional]

    Available options for the "chartConfig" JSON block (only provide if a chart is relevant to visualize the query):
    - "chartType": "bar", "line", "pie" or null
    - "xAxis": Column name for labels
    - "yAxis": Column name for values
    - "title": Descriptive title for the chart

    Output a JSON containing:
    {{
      "pandas_operation": {{ ... }},
      "chartConfig": {{ ... }} or null
    }}
    
    Ensure all column names match exactly. If the user's query doesn't ask for a visualization or grouping, keep groupBy and chartConfig null.
    """
    
    try:
        # Call Gemini to get the spec
        model = genai.getGenerativeModel('gemini-1.5-flash', generation_config={"response_mime_type": "application/json"})
        spec_response = model.generate_content(spec_prompt)
        spec_data = json.loads(spec_response.text)
        
        pandas_spec = spec_data.get("pandas_operation", {})
        chart_config = spec_data.get("chartConfig")
        
        # STEP 2: Execute pandas operations on the dataframe
        result_df = execute_pandas_spec(df, pandas_spec)
        
        # Format the result data for frontend charting and explanation
        calculated_results = result_df.fillna('').to_dict(orient='records')
        
        # Formulate chartData in the format required by react-chartjs-2
        chart_data_resp = None
        if chart_config and chart_config.get("chartType") and len(result_df) > 0:
            x_col = chart_config.get("xAxis")
            y_col = chart_config.get("yAxis")
            
            # If specified axes don't exist in result, fall back to first two columns
            if x_col not in result_df.columns or y_col not in result_df.columns:
                cols = list(result_df.columns)
                if len(cols) >= 2:
                    x_col = cols[0]
                    y_col = cols[1]
                    chart_config["xAxis"] = x_col
                    chart_config["yAxis"] = y_col
            
            if x_col in result_df.columns and y_col in result_df.columns:
                # Convert x values to strings for chart labels
                labels = [str(val) for val in result_df[x_col].tolist()]
                # Convert y values to floats/ints for chart values
                data_points = []
                for val in result_df[y_col].tolist():
                    try:
                        data_points.append(float(val))
                    except (ValueError, TypeError):
                        data_points.append(0.0)
                        
                chart_data_resp = {
                    "labels": labels,
                    "data": data_points,
                    "xAxisLabel": x_col,
                    "yAxisLabel": y_col
                }
        
        # STEP 3: Write explanation answer using the calculated results
        writer_prompt = f"""
        You are a business intelligence assistant. Answer the user's query based on the ACTUAL calculated statistics and aggregated data points.

        User Query: "{payload.query}"
        Spreadsheet Name/Path: {payload.file_path}
        Calculated Results from Dataset: {json.dumps(calculated_results)}
        Chart Configured (if any): {json.dumps(chart_config)}

        Task:
        Write a concise, professional markdown explanation summarizing the findings. Directly reference the actual numbers from the calculated results (do not hallucinate other values). If a chart is being shown, explain what the chart trends indicate.

        Answer:
        """
        
        text_model = genai.getGenerativeModel('gemini-1.5-flash')
        answer_response = text_model.generate_content(writer_prompt)
        answer_text = answer_response.text
        
        return {
            "answer": answer_text,
            "chartConfig": chart_config,
            "chartData": chart_data_resp,
            "calculatedData": calculated_results[:50]  # limit to 50 rows preview
        }
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to execute NLP query: {str(e)}")

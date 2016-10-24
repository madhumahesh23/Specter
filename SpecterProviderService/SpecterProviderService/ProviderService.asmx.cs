using System;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using System.Linq;
using System.Text;
using System.Web;
using System.Web.Configuration;
using System.Web.Script.Serialization;
using System.Web.Script.Services;
using System.Web.Services;
//using Microsoft.AnalysisServices.AdomdClient;
namespace SpecterProviderService
{
    /// <summary>
    /// Summary description for ProviderService
    /// </summary>
    [WebService(Namespace = "http://tempuri.org/")]
    [WebServiceBinding(ConformsTo = WsiProfiles.BasicProfile1_1)]
    [System.ComponentModel.ToolboxItem(false)]
    // To allow this Web Service to be called from script, using ASP.NET AJAX, uncomment the following line. 
    // [System.Web.Script.Services.ScriptService]
    public class ProviderService : System.Web.Services.WebService
    {

        public string ConnectionString
        {
            get
            {
                string server = WebConfigurationManager.AppSettings["configserver"];
                string database = WebConfigurationManager.AppSettings["configdatabase"];
                return string.Format("Data Source={0};Initial Catalog={1};Integrated Security=SSPI;", server, database);
            }            
        }


        [WebMethod, ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public void GetResult(string query)
        {


            string myJsonString = string.Empty;
            try
            {
                HttpContext.Current.Response.ContentType = "application/json";

                JavaScriptSerializer serializer = new JavaScriptSerializer();
               
//                query = serializer.Deserialize<string>(query);

                
                using (SqlConnection con = new SqlConnection(this.ConnectionString))
                {                    
                    con.Open();
                    string selectstmt = query;
                    SqlCommand cmd = new SqlCommand(selectstmt, con);                   
                    SqlDataAdapter da = new SqlDataAdapter(cmd);

                    DataSet ds = new DataSet();
                    da.Fill(ds);

                    DataTable dt = ds.Tables[0];
                    List<Dictionary<string, object>> rows = new List<Dictionary<string, object>>();
                    Dictionary<string, object> row;
                    foreach (DataRow dr in dt.Rows)
                    {
                        row = new Dictionary<string, object>();
                        foreach (DataColumn col in dt.Columns)
                        {
                            row.Add(col.ColumnName, dr[col]);
                        }
                        rows.Add(row);
                    }
                    myJsonString = (new JavaScriptSerializer()).Serialize(rows);
                }
            }
            catch (Exception ex)
            {
                myJsonString = (new JavaScriptSerializer()).Serialize(ex.Message);                
                //throw ex;
            }
            // return CreateTable(designerform.server, designerform.database, designerform.table, designerform.Controls[0].columns);
            HttpContext.Current.Response.Write(myJsonString);
        }

       // [WebMethod, ScriptMethod(ResponseFormat = ResponseFormat.Json)]
//        public void GetDAXResult(string daxQuery)
//        {

//            string myJsonString = string.Empty;
//            try
//            {
//                HttpContext.Current.Response.ContentType = "application/json";

//                JavaScriptSerializer serializer = new JavaScriptSerializer();
//                string connectionString = @"Provider=MSOLAP;Data Source=RHWDB349A\Dev_AS_BI_2;Catalog=PhsyicianAssignment_349_smuruge1_44978595-3acc-4dd4-a2b7-918ea69e875f";
//                string queryString = @"
//                   EVALUATE 
//  (
//    FILTER
//   (
//      'ProviderTimelyevents',AND
//	  ('ProviderTimelyevents'[providerId] = ""H506324"",'ProviderTimelyevents'[EventType]=""progress Notes"" )
//   )
//   )
//                    ";
//                AdomdConnection connection = new AdomdConnection();
//                connection.ConnectionString = connectionString;
//                connection.Open();
//                List<Dictionary<string, object>> rows = new List<Dictionary<string, object>>();
//                AdomdCommand cmd = new AdomdCommand(queryString);

//               // cmd.Parameters.Add("Category", "Bikes");
//                cmd.Connection = connection;
//                using (var reader = cmd.ExecuteReader())
//                {
//                    Dictionary<string, object> row =  new Dictionary<string,object>();
//                    while (reader.Read())
//                    {
//                         row = new Dictionary<string, object>();
//                        for (int i = 0; i < reader.FieldCount; i++)
//                        {

//                            row.Add(reader.GetName(i), reader[i]);
//                        }
//                    }
//                    rows.Add(row);
//                }
//                myJsonString = (new JavaScriptSerializer()).Serialize(rows);
//            }
//            catch(Exception ex)
//            {
//                myJsonString = (new JavaScriptSerializer()).Serialize(ex.Message);
//                //throw ex;
//            }
//            // return CreateTable(designerform.server, designerform.database, designerform.table, designerform.Controls[0].columns);
//            HttpContext.Current.Response.Write(myJsonString);
//        }

        [WebMethod, ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public void GetQuerySetResult(string query)
        {


            string myJsonString = string.Empty;
            try
            {
                HttpContext.Current.Response.ContentType = "application/json";

                JavaScriptSerializer serializer = new JavaScriptSerializer();
               // serializer.MaxJsonLength = Int32.MaxValue;
                //                query = serializer.Deserialize<string>(query);

                //QuerySet qSet = serializer.Deserialize<QuerySet>(querySet);
                using (SqlConnection con = new SqlConnection(this.ConnectionString))
                {
                    con.Open();
                    string selectstmt = query; // prepareQuery(qSet, dataTable);
                    SqlCommand cmd = new SqlCommand(selectstmt, con);
                    SqlDataAdapter da = new SqlDataAdapter(cmd);

                    DataSet ds = new DataSet();
                    da.Fill(ds);

                    DataTable dt = ds.Tables[0];
                    List<Dictionary<string, object>> rows = new List<Dictionary<string, object>>();
                    Dictionary<string, object> row;
                    foreach (DataRow dr in dt.Rows)
                    {
                        row = new Dictionary<string, object>();
                        foreach (DataColumn col in dt.Columns)
                        {
                            row.Add(col.ColumnName, Convert.ToString(dr[col]));
                        }
                        rows.Add(row);
                    }
                    myJsonString = (new JavaScriptSerializer()).Serialize(rows);
                }
            }
            catch (Exception ex)
            {
                myJsonString = (new JavaScriptSerializer()).Serialize(ex.Message);
                //throw ex;
            }
            // return CreateTable(designerform.server, designerform.database, designerform.table, designerform.Controls[0].columns);
            HttpContext.Current.Response.Write(myJsonString);
        }

        [WebMethod, ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public void GetColumns(string query, string constring)
        {
            string myJsonString = string.Empty;
            DataTable schemaTable;
            List<string> clmNames = new List<string>();
            try
            {
                JavaScriptSerializer serializer = new JavaScriptSerializer();
                //constring = @"Data Source=rhwdb368a\prd_sql_bi_1;Initial Catalog=ITDEV_EUDB;Integrated Security=SSPI;";//serializer.Deserialize<string>(constring);

               // query = @"select Event_Name, sum(Event_value) as SumofEvents from datavisualization_unpivot where Event_Name like '%_NR' group by Event_Name order by Event_Name";// serializer.Deserialize<string>(query);

                HttpContext.Current.Response.ContentType = "application/json";
                using (SqlConnection conn = new SqlConnection(this.ConnectionString))
                {
                    SqlCommand cmd = new SqlCommand(query, conn);

                    conn.Open(); // throws if invalid

                    SqlDataReader dr = cmd.ExecuteReader(CommandBehavior.KeyInfo);
                    //Retrieve column schema into a DataTable.
                    schemaTable = dr.GetSchemaTable();
                    //For each field in the table...
                    foreach (DataRow myField in schemaTable.Rows)
                    {
                        ////For each property of the field...
                        //foreach (DataColumn myProperty in schemaTable.Columns)
                        //{
                        //    //Display the field name and value.
                        clmNames.Add(myField["ColumnName"].ToString());// + " = " + myField[myProperty].ToString());
                        //}
                        // Console.WriteLine();

                        //Pause.
                        //  Console.ReadLine();
                    }

                    myJsonString = (new JavaScriptSerializer()).Serialize(clmNames);
                    dr.Close();
                    conn.Close();
                }

            }
            catch (Exception ex)
            {
                myJsonString = ex.Message;
            }

            HttpContext.Current.Response.Write(myJsonString);
        }

        [WebMethod, ScriptMethod(ResponseFormat = ResponseFormat.Json)]
        public void GetStoredProcColumns(string storedproc, string constring)
        {
            string myJsonString = string.Empty;
            Dictionary<string, string> clmNames = new Dictionary<string,string>();
            try
            {
                JavaScriptSerializer serializer = new JavaScriptSerializer();
                //constring = @"Data Source=rhwdb368a\prd_sql_bi_1;Initial Catalog=ITDEV_EUDB;Integrated Security=SSPI;";//serializer.Deserialize<string>(constring);

                // query = @"select Event_Name, sum(Event_value) as SumofEvents from datavisualization_unpivot where Event_Name like '%_NR' group by Event_Name order by Event_Name";// serializer.Deserialize<string>(query);

                HttpContext.Current.Response.ContentType = "application/json";
                using (SqlConnection conn = new SqlConnection(constring))
                {
                    string query = string.Format("SELECT name,system_type_name FROM sys.dm_exec_describe_first_result_set_for_object(OBJECT_ID('{0}'), 1) ;", storedproc);
                    SqlCommand cmd = new SqlCommand(query, conn);

                    conn.Open(); // throws if invalid

                    SqlDataAdapter da = new SqlDataAdapter(cmd);
                    DataSet ds = new DataSet();
                    da.Fill(ds);
                    //For each field in the table...
                    foreach (DataRow row in ds.Tables[0].Rows)
                    {                       
                        clmNames.Add(row[0].ToString(),row[1].ToString());
                    }

                    myJsonString = (new JavaScriptSerializer()).Serialize(clmNames);
                    conn.Close();
                }

            }
            catch (Exception ex)
            {
                myJsonString = ex.Message;
            }

            HttpContext.Current.Response.Write(myJsonString);
        }

        private string prepareQuery(QuerySet querySet,string datatable)
        {
            StringBuilder qry = new StringBuilder("select ");
            try
            {

                string[] select = querySet.Select.Select(f => {
                    string alias = f;
                    if (f.IndexOf('(') != -1 || f.IndexOf(')') != -1)
                    {
                        alias = alias.Replace('(', '_');
                        alias = alias.Replace(')', ' ');
                    }

                    return  f + " as " + alias;                    
                
                }).ToArray();

                string selectStmts = string.Join(",", select);
                qry.Append(selectStmts);
                
                qry.Append(" from ##" + datatable + " as " + datatable + " ");
                string whereStmts = "";
                if (querySet.Where !=null && querySet.Where.Length > 0)
                {
                    whereStmts = string.Join(",", querySet.Where);
                    qry.Append(whereStmts);
                }
                if (querySet.Groupby!=null && querySet.Groupby.Length > 0)
                {
                    string groupStmts = string.Join(",", querySet.Groupby);
                    qry.Append(" group by " + groupStmts);
                }

            }
            catch
            {
                throw;
            }
            return qry.ToString();
        }
    }

    public class QuerySet
    {
        public string[] Select
        {
            get;
            set;
        }
        public string[] Groupby
        {
            get;
            set;
        }
        public string[] Where
        {
            get;
            set;
        }
    }
}

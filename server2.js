 
// const express = require('express');
// const cors = require('cors');
// const { GoogleGenerativeAI } = require('@google/generative-ai');
// const { Pool } = require('pg');
// require('dotenv').config();

// const app = express();

// // Middleware
// app.use(cors());
// app.use(express.json());

// // Initialize Gemini AI
// const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
// const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

// // Initialize PostgreSQL connection with better configuration
// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
//   max: 20, // Maximum number of clients in the pool
//   idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
//   connectionTimeoutMillis: 10000, // Return an error after 10 seconds if connection could not be established
//   keepAlive: true,
//   keepAliveInitialDelayMs: 10000
// });

// // Handle pool errors
// pool.on('error', (err, client) => {
//   console.error('❌ Unexpected error on idle client', err);
// });

// // Test database connection
// pool.connect()
//   .then(client => {
//     console.log('✅ Database connected successfully');
//     client.release();
//   })
//   .catch(err => {
//     console.error('❌ Database connection error:', err.message);
//   });

// // ============= NL-to-SQL Functions =============

// async function getDatabaseSchema() {
//   const client = await pool.connect();
//   try {
//     const query = `
//       SELECT 
//         table_name,
//         column_name,
//         data_type,
//         is_nullable
//       FROM information_schema.columns
//       WHERE table_schema = 'public'
//       ORDER BY table_name, ordinal_position;
//     `;
    
//     const result = await client.query(query);
    
//     const schemaByTable = {};
//     result.rows.forEach(row => {
//       if (!schemaByTable[row.table_name]) {
//         schemaByTable[row.table_name] = [];
//       }
//       schemaByTable[row.table_name].push({
//         column: row.column_name,
//         type: row.data_type,
//         nullable: row.is_nullable === 'YES'
//       });
//     });
    
//     return schemaByTable;
//   } catch (error) {
//     console.error('Error fetching schema:', error);
//     throw error;
//   } finally {
//     client.release();
//   }
// }

// async function generateSQL(naturalLanguageQuery, schema) {
//   const schemaText = Object.entries(schema)
//     .map(([table, columns]) => {
//       const columnDefs = columns
//         .map(col => `  - ${col.column} (${col.type})`)
//         .join('\n');
//       return `Table: ${table}\n${columnDefs}`;
//     })
//     .join('\n\n');

//   const prompt = `You are a SQL expert. Convert the following natural language query into a SQL query.

// Database Schema:
// ${schemaText}

// Natural Language Query: ${naturalLanguageQuery}

// Rules:
// 1. Generate ONLY the SQL query, no explanations
// 2. Use proper PostgreSQL syntax
// 3. Use table and column names exactly as shown in the schema
// 4. For SELECT queries, limit results to 100 rows unless specified
// 5. Be careful with JOIN conditions
// 6. IMPORTANT: Use ILIKE (case-insensitive) instead of LIKE for text comparisons, and use LOWER() function for exact text matches to make searches case-insensitive
// 7. For text comparisons, always use: LOWER(column_name) = LOWER('value') OR column_name ILIKE 'value'
// 8. Return ONLY the SQL query without any markdown formatting or additional text

// SQL Query:`;

//   try {
//     const result = await model.generateContent(prompt);
//     const response = await result.response;
//     let sqlQuery = response.text().trim();
    
//     // Clean up the response
//     sqlQuery = sqlQuery.replace(/```sql\n?/g, '').replace(/```\n?/g, '').trim();
    
//     return sqlQuery;
//   } catch (error) {
//     console.error('Error generating SQL:', error);
//     throw error;
//   }
// }

// async function executeSQL(sqlQuery) {
//   // Basic SQL injection prevention - only allow SELECT queries
//   const trimmedQuery = sqlQuery.trim().toUpperCase();
//   if (!trimmedQuery.startsWith('SELECT')) {
//     throw new Error('Only SELECT queries are allowed for safety reasons');
//   }
  
//   const client = await pool.connect();
//   try {
//     const result = await client.query(sqlQuery);
//     return result.rows;
//   } catch (error) {
//     console.error('Error executing SQL:', error);
//     throw error;
//   } finally {
//     client.release();
//   }
// }

// async function analyzeAndFormatResults(rows, sqlQuery, originalQuery) {
//   if (rows.length === 0) {
//     return 'No results found for your query.';
//   }
  
//   // Check if this is a comparison or analytical query
//   const isComparison = originalQuery.toLowerCase().includes('compare') || 
//                        originalQuery.toLowerCase().includes('vs') ||
//                        originalQuery.toLowerCase().includes('versus');
  
//   const isAggregation = sqlQuery.toUpperCase().includes('SUM(') || 
//                         sqlQuery.toUpperCase().includes('COUNT(') || 
//                         sqlQuery.toUpperCase().includes('AVG(') ||
//                         sqlQuery.toUpperCase().includes('GROUP BY');
  
//   // If it's a comparison or aggregation, generate an AI summary
//   if (isComparison || isAggregation || rows.length <= 10) {
//     try {
//       const summary = await generateSummary(rows, originalQuery, sqlQuery);
//       return summary;
//     } catch (error) {
//       console.error('Error generating summary, falling back to formatted results:', error);
//       // Fall back to formatted results if AI fails
//     }
//   }
  
//   // Otherwise, return formatted results
//   return formatResults(rows, sqlQuery);
// }

// async function generateSummary(rows, originalQuery, sqlQuery) {
//   const dataString = JSON.stringify(rows, null, 2);
  
//   const prompt = `You are a data analyst. Analyze the following query results and provide a clear, concise summary.

// Original Question: ${originalQuery}

// Query Results:
// ${dataString}

// Instructions:
// 1. Provide a natural language answer to the user's question
// 2. Highlight key insights and comparisons
// 3. Use emojis to make it engaging (📊 for stats, 🏆 for winners, 📈 for trends)
// 4. If comparing values, clearly state which is higher/lower
// 5. Format numbers with commas for readability
// 6. Keep it concise but informative
// 7. Don't mention SQL or technical details

// Summary:`;

//   try {
//     const result = await model.generateContent(prompt);
//     const response = await result.response;
//     let summary = response.text().trim();
    
//     // Add the raw data at the end for reference
//     summary += '\n\n━━━━━━━━━━━━━━━━━━━━\n📋 Detailed Results:\n━━━━━━━━━━━━━━━━━━━━\n\n';
//     summary += formatResults(rows, sqlQuery);
    
//     return summary;
//   } catch (error) {
//     console.error('Error in generateSummary:', error);
//     throw error;
//   }
// }

// function formatResults(rows, sqlQuery) {
//   if (rows.length === 0) {
//     return 'No results found.';
//   }
  
//   const rowCount = rows.length;
//   const columns = Object.keys(rows[0]);
  
//   // Format column names to be more readable
//   const formatColumnName = (col) => {
//     return col.split('_')
//       .map(word => word.charAt(0).toUpperCase() + word.slice(1))
//       .join(' ');
//   };
  
//   // Format values
//   const formatValue = (value, key) => {
//     if (value === null || value === undefined) return 'N/A';
    
//     // Format dates
//     if (value instanceof Date) {
//       return value.toLocaleDateString('en-US', { 
//         year: 'numeric', 
//         month: 'short', 
//         day: 'numeric' 
//       });
//     }
    
//     // Format large numbers with commas
//     if (typeof value === 'number' && (key.includes('view') || key.includes('like') || key.includes('comment') || key.includes('follower') || key.includes('sum') || key.includes('total') || key.includes('count'))) {
//       return value.toLocaleString();
//     }
    
//     return value;
//   };
  
//   let response = '';
  
//   const displayLimit = Math.min(10, rowCount);
//   rows.slice(0, displayLimit).forEach((row, idx) => {
//     response += `Result ${idx + 1}:\n`;
//     columns.forEach(col => {
//       const formattedName = formatColumnName(col);
//       const formattedValue = formatValue(row[col], col);
//       response += `  ${formattedName}: ${formattedValue}\n`;
//     });
//     response += '\n';
//   });
  
//   if (rowCount > displayLimit) {
//     response += `... and ${rowCount - displayLimit} more result${rowCount - displayLimit > 1 ? 's' : ''}`;
//   }
  
//   return response;
// }

// // ============= Routes =============

// app.get('/', (req, res) => {
//   res.json({ 
//     message: 'Backend API is running',
//     endpoints: {
//       health: '/health',
//       nlToSql: '/api/nl-query',
//       schema: '/api/schema'
//     }
//   });
// });

// app.get('/health', (req, res) => {
//   res.json({ status: 'healthy', timestamp: new Date().toISOString() });
// });

// // Get database schema endpoint
// app.get('/api/schema', async (req, res) => {
//   try {
//     const schema = await getDatabaseSchema();
//     res.json({ success: true, schema });
//   } catch (error) {
//     console.error('Error fetching schema:', error);
//     res.status(500).json({ 
//       success: false, 
//       error: 'Failed to fetch database schema' 
//     });
//   }
// });

// // Natural Language to SQL endpoint
// app.post('/api/nl-query', async (req, res) => {
//   try {
//     const { query } = req.body;
    
//     if (!query) {
//       return res.status(400).json({
//         success: false,
//         error: 'Query is required'
//       });
//     }
    
//     console.log('📝 Received query:', query);
    
//     // Get database schema
//     const schema = await getDatabaseSchema();
//     console.log('📊 Schema fetched');
    
//     // Generate SQL from natural language
//     const sqlQuery = await generateSQL(query, schema);
//     console.log('🔧 Generated SQL:', sqlQuery);
    
//     // Execute SQL query
//     const results = await executeSQL(sqlQuery);
//     console.log('✅ Query executed, rows:', results.length);
    
//     // Format response
//     const answer = formatResults(results, sqlQuery);
    
//     res.json({
//       success: true,
//       answer,
//       sql: sqlQuery,
//       results: results.slice(0, 100),
//       rowCount: results.length
//     });
    
//   } catch (error) {
//     console.error('❌ Error processing query:', error);
//     res.status(500).json({
//       success: false,
//       error: error.message
//     });
//   }
// });

// // Graceful shutdown
// process.on('SIGTERM', () => {
//   console.log('SIGTERM signal received: closing HTTP server');
//   pool.end(() => {
//     console.log('Database pool closed');
//   });
// });

// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => {
//   console.log(`🚀 Server running on port ${PORT}`);
//   console.log(`📍 http://localhost:${PORT}`);
// });

// module.exports = app;


// const express = require('express');
// const cors = require('cors');
// const { GoogleGenerativeAI } = require('@google/generative-ai');
// const { Pool } = require('pg');
// const ExcelJS = require('exceljs');
// require('dotenv').config();

// const app = express();

// // Middleware
// app.use(cors());
// app.use(express.json());

// // Initialize Gemini AI
// const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
// const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

// // Initialize PostgreSQL connection with better configuration
// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
//   max: 20,
//   idleTimeoutMillis: 30000,
//   connectionTimeoutMillis: 10000,
//   keepAlive: true,
//   keepAliveInitialDelayMs: 10000
// });


// pool.on('error', (err, client) => {
//   console.error('❌ Unexpected error on idle client', err);
// });


// pool.connect()
//   .then(client => {
//     console.log('✅ Database connected successfully');
//     client.release();
//   })
//   .catch(err => {
//     console.error('❌ Database connection error:', err.message);
//   });

// // ============= NL-to-SQL Functions =============

// async function getDatabaseSchema() {
//   const client = await pool.connect();
//   try {
//     const query = `
//       SELECT 
//         table_name,
//         column_name,
//         data_type,
//         is_nullable
//       FROM information_schema.columns
//       WHERE table_schema = 'public'
//       ORDER BY table_name, ordinal_position;
//     `;
    
//     const result = await client.query(query);
    
//     const schemaByTable = {};
//     result.rows.forEach(row => {
//       if (!schemaByTable[row.table_name]) {
//         schemaByTable[row.table_name] = [];
//       }
//       schemaByTable[row.table_name].push({
//         column: row.column_name,
//         type: row.data_type,
//         nullable: row.is_nullable === 'YES'
//       });
//     });
    
//     return schemaByTable;
//   } catch (error) {
//     console.error('Error fetching schema:', error);
//     throw error;
//   } finally {
//     client.release();
//   }
// }

// async function generateSQL(naturalLanguageQuery, schema) {
//   const schemaText = Object.entries(schema)
//     .map(([table, columns]) => {
//       const columnDefs = columns
//         .map(col => `  - ${col.column} (${col.type})`)
//         .join('\n');
//       return `Table: ${table}\n${columnDefs}`;
//     })
//     .join('\n\n');

//   const prompt = `You are a SQL expert. Convert the following natural language query into a SQL query.

// Database Schema:
// ${schemaText}

// Natural Language Query: ${naturalLanguageQuery}

// Rules:
// 1. Generate ONLY the SQL query, no explanations
// 2. Use proper PostgreSQL syntax
// 3. Use table and column names exactly as shown in the schema
// 4. For SELECT queries, limit results to 100 rows unless specified
// 5. Be careful with JOIN conditions
// 6. IMPORTANT: Use ILIKE (case-insensitive) instead of LIKE for text comparisons, and use LOWER() function for exact text matches to make searches case-insensitive
// 7. For text comparisons, always use: LOWER(column_name) = LOWER('value') OR column_name ILIKE 'value'
// 8. Return ONLY the SQL query without any markdown formatting or additional text

// SQL Query:`;

//   try {
//     const result = await model.generateContent(prompt);
//     const response = await result.response;
//     let sqlQuery = response.text().trim();
    
//     sqlQuery = sqlQuery.replace(/```sql\n?/g, '').replace(/```\n?/g, '').trim();
    
//     return sqlQuery;
//   } catch (error) {
//     console.error('Error generating SQL:', error);
//     throw error;
//   }
// }

// async function executeSQL(sqlQuery) {
//   const trimmedQuery = sqlQuery.trim().toUpperCase();
//   if (!trimmedQuery.startsWith('SELECT')) {
//     throw new Error('Only SELECT queries are allowed for safety reasons');
//   }
  
//   const client = await pool.connect();
//   try {
//     const result = await client.query(sqlQuery);
//     return result.rows;
//   } catch (error) {
//     console.error('Error executing SQL:', error);
//     throw error;
//   } finally {
//     client.release();
//   }
// }

// async function analyzeAndFormatResults(rows, sqlQuery, originalQuery) {
//   if (rows.length === 0) {
//     return 'No results found for your query.';
//   }
  
//   const isComparison = originalQuery.toLowerCase().includes('compare') || 
//                        originalQuery.toLowerCase().includes('vs') ||
//                        originalQuery.toLowerCase().includes('versus');
  
//   const isAggregation = sqlQuery.toUpperCase().includes('SUM(') || 
//                         sqlQuery.toUpperCase().includes('COUNT(') || 
//                         sqlQuery.toUpperCase().includes('AVG(') ||
//                         sqlQuery.toUpperCase().includes('GROUP BY');
  
//   if (isComparison || isAggregation || rows.length <= 10) {
//     try {
//       const summary = await generateSummary(rows, originalQuery, sqlQuery);
//       return summary;
//     } catch (error) {
//       console.error('Error generating summary, falling back to formatted results:', error);
//     }
//   }
  
//   return formatResults(rows, sqlQuery);
// }

// async function generateSummary(rows, originalQuery, sqlQuery) {
//   const dataString = JSON.stringify(rows, null, 2);
  
//   const prompt = `You are a data analyst. Analyze the following query results and provide a clear, concise summary.

// Original Question: ${originalQuery}

// Query Results:
// ${dataString}

// Instructions:
// 1. Provide a natural language answer to the user's question
// 2. Highlight key insights and comparisons
// 3. Use emojis to make it engaging (📊 for stats, 🏆 for winners, 📈 for trends)
// 4. If comparing values, clearly state which is higher/lower
// 5. Format numbers with commas for readability
// 6. Keep it concise but informative
// 7. Don't mention SQL or technical details

// Summary:`;

//   try {
//     const result = await model.generateContent(prompt);
//     const response = await result.response;
//     let summary = response.text().trim();
    
//     summary += '\n\n━━━━━━━━━━━━━━━━━━━━\n📋 Detailed Results:\n━━━━━━━━━━━━━━━━━━━━\n\n';
//     summary += formatResults(rows, sqlQuery);
    
//     return summary;
//   } catch (error) {
//     console.error('Error in generateSummary:', error);
//     throw error;
//   }
// }

// function formatResults(rows, sqlQuery) {
//   if (rows.length === 0) {
//     return 'No results found.';
//   }
  
//   const rowCount = rows.length;
//   const columns = Object.keys(rows[0]);
  
//   const formatColumnName = (col) => {
//     return col.split('_')
//       .map(word => word.charAt(0).toUpperCase() + word.slice(1))
//       .join(' ');
//   };
  
//   const formatValue = (value, key) => {
//     if (value === null || value === undefined) return 'N/A';
    
//     if (value instanceof Date) {
//       return value.toLocaleDateString('en-US', { 
//         year: 'numeric', 
//         month: 'short', 
//         day: 'numeric' 
//       });
//     }
    
//     if (typeof value === 'number' && (key.includes('view') || key.includes('like') || key.includes('comment') || key.includes('follower') || key.includes('sum') || key.includes('total') || key.includes('count'))) {
//       return value.toLocaleString();
//     }
    
//     return value;
//   };
  
//   let response = '';
  
//   const displayLimit = Math.min(10, rowCount);
//   rows.slice(0, displayLimit).forEach((row, idx) => {
//     response += `Result ${idx + 1}:\n`;
//     columns.forEach(col => {
//       const formattedName = formatColumnName(col);
//       const formattedValue = formatValue(row[col], col);
//       response += `  ${formattedName}: ${formattedValue}\n`;
//     });
//     response += '\n';
//   });
  
//   if (rowCount > displayLimit) {
//     response += `... and ${rowCount - displayLimit} more result${rowCount - displayLimit > 1 ? 's' : ''}`;
//   }
  
//   return response;
// }

// // ============= Excel Export Function =============

// async function generateExcel(rows, query) {
//   const workbook = new ExcelJS.Workbook();
//   const worksheet = workbook.addWorksheet('Query Results');
  
//   if (rows.length === 0) {
//     worksheet.addRow(['No results found']);
//     return workbook;
//   }
  
//   // Get column names
//   const columns = Object.keys(rows[0]);
  
//   // Format column names
//   const formatColumnName = (col) => {
//     return col.split('_')
//       .map(word => word.charAt(0).toUpperCase() + word.slice(1))
//       .join(' ');
//   };
  
//   // Add header row with formatting
//   const headerRow = worksheet.addRow(columns.map(formatColumnName));
//   headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
//   headerRow.fill = {
//     type: 'pattern',
//     pattern: 'solid',
//     fgColor: { argb: 'FF4472C4' }
//   };
//   headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  
//   // Add data rows
//   rows.forEach(row => {
//     const values = columns.map(col => {
//       const value = row[col];
//       if (value === null || value === undefined) return 'N/A';
//       if (value instanceof Date) return value;
//       return value;
//     });
//     worksheet.addRow(values);
//   });
  
//   // Auto-fit columns
//   worksheet.columns.forEach((column, index) => {
//     let maxLength = 0;
//     column.eachCell({ includeEmpty: true }, (cell) => {
//       const columnLength = cell.value ? cell.value.toString().length : 10;
//       if (columnLength > maxLength) {
//         maxLength = columnLength;
//       }
//     });
//     column.width = Math.min(maxLength + 2, 50);
//   });
  
//   // Add borders to all cells
//   worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
//     row.eachCell({ includeEmpty: false }, (cell) => {
//       cell.border = {
//         top: { style: 'thin' },
//         left: { style: 'thin' },
//         bottom: { style: 'thin' },
//         right: { style: 'thin' }
//       };
//     });
//   });
  
//   // Add metadata sheet
//   const metaSheet = workbook.addWorksheet('Query Info');
//   metaSheet.addRow(['Query', query]);
//   metaSheet.addRow(['Generated', new Date().toLocaleString()]);
//   metaSheet.addRow(['Total Rows', rows.length]);
//   metaSheet.getColumn(1).width = 15;
//   metaSheet.getColumn(2).width = 50;
  
//   return workbook;
// }

// // ============= Routes =============

// app.get('/', (req, res) => {
//   res.json({ 
//     message: 'Backend API is running',
//     endpoints: {
//       health: '/health',
//       nlToSql: '/api/nl-query',
//       schema: '/api/schema',
//       exportExcel: '/api/export-excel'
//     }
//   });
// });

// app.get('/health', (req, res) => {
//   res.json({ status: 'healthy', timestamp: new Date().toISOString() });
// });

// app.get('/api/schema', async (req, res) => {
//   try {
//     const schema = await getDatabaseSchema();
//     res.json({ success: true, schema });
//   } catch (error) {
//     console.error('Error fetching schema:', error);
//     res.status(500).json({ 
//       success: false, 
//       error: 'Failed to fetch database schema' 
//     });
//   }
// });

// app.post('/api/nl-query', async (req, res) => {
//   try {
//     const { query } = req.body;
    
//     if (!query) {
//       return res.status(400).json({
//         success: false,
//         error: 'Query is required'
//       });
//     }
    
//     console.log('📝 Received query:', query);
    
//     const schema = await getDatabaseSchema();
//     console.log('📊 Schema fetched');
    
//     const sqlQuery = await generateSQL(query, schema);
//     console.log('🔧 Generated SQL:', sqlQuery);
    
//     const results = await executeSQL(sqlQuery);
//     console.log('✅ Query executed, rows:', results.length);
    
//     const answer = formatResults(results, sqlQuery);
    
//     // Determine if results are exportable (tabular data)
//     const hasExportableData = results.length > 0 && typeof results[0] === 'object';
    
//     res.json({
//       success: true,
//       answer,
//       sql: sqlQuery,
//       results: results.slice(0, 100),
//       rowCount: results.length,
//       hasExport: hasExportableData,
//       query: query // Send back original query for export
//     });
    
//   } catch (error) {
//     console.error('❌ Error processing query:', error);
//     res.status(500).json({
//       success: false,
//       error: error.message
//     });
//   }
// });

// // Excel export endpoint
// app.post('/api/export-excel', async (req, res) => {
//   try {
//     const { sql, query } = req.body;
    
//     if (!sql) {
//       return res.status(400).json({
//         success: false,
//         error: 'SQL query is required'
//       });
//     }
    
//     console.log('📊 Exporting to Excel:', sql);
    
//     // Execute the SQL query
//     const results = await executeSQL(sql);
    
//     if (results.length === 0) {
//       return res.status(400).json({
//         success: false,
//         error: 'No data to export'
//       });
//     }
    
//     // Generate Excel file
//     const workbook = await generateExcel(results, query || 'Query Results');
    
//     // Set response headers for file download
//     res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
//     res.setHeader('Content-Disposition', `attachment; filename=query_results_${Date.now()}.xlsx`);
    
//     // Write to response
//     await workbook.xlsx.write(res);
//     res.end();
    
//     console.log('✅ Excel file generated successfully');
    
//   } catch (error) {
//     console.error('❌ Error exporting to Excel:', error);
//     res.status(500).json({
//       success: false,
//       error: error.message
//     });
//   }
// });

// // Graceful shutdown
// process.on('SIGTERM', () => {
//   console.log('SIGTERM signal received: closing HTTP server');
//   pool.end(() => {
//     console.log('Database pool closed');
//   });
// });

// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => {
//   console.log(`🚀 Server running on port ${PORT}`);
//   console.log(`📍 http://localhost:${PORT}`);
// });

// module.exports = app;

// const express = require('express');
// const cors = require('cors');
// const { GoogleGenerativeAI } = require('@google/generative-ai');
// const { Pool } = require('pg');
// const ExcelJS = require('exceljs');
// require('dotenv').config();

// const app = express();

// // Middleware
// app.use(cors());
// app.use(express.json());

// // Initialize Gemini AI
// const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
// const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

// // Initialize PostgreSQL connection
// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
//   max: 20,
//   idleTimeoutMillis: 30000,
//   connectionTimeoutMillis: 10000,
//   keepAlive: true,
//   keepAliveInitialDelayMs: 10000
// });

// pool.on('error', (err, client) => {
//   console.error('❌ Unexpected error on idle client', err);
// });

// pool.connect()
//   .then(client => {
//     console.log('✅ Database connected successfully');
//     client.release();
//   })
//   .catch(err => {
//     console.error('❌ Database connection error:', err.message);
//   });

// // ============= NL-to-SQL Functions =============

// async function getDatabaseSchema() {
//   const client = await pool.connect();
//   try {
//     const query = `
//       SELECT 
//         table_name,
//         column_name,
//         data_type,
//         is_nullable
//       FROM information_schema.columns
//       WHERE table_schema = 'public'
//       ORDER BY table_name, ordinal_position;
//     `;
    
//     const result = await client.query(query);
    
//     const schemaByTable = {};
//     result.rows.forEach(row => {
//       if (!schemaByTable[row.table_name]) {
//         schemaByTable[row.table_name] = [];
//       }
//       schemaByTable[row.table_name].push({
//         column: row.column_name,
//         type: row.data_type,
//         nullable: row.is_nullable === 'YES'
//       });
//     });
    
//     return schemaByTable;
//   } catch (error) {
//     console.error('Error fetching schema:', error);
//     throw error;
//   } finally {
//     client.release();
//   }
// }

// async function generateSQL(naturalLanguageQuery, schema) {
//   const schemaText = Object.entries(schema)
//     .map(([table, columns]) => {
//       const columnDefs = columns
//         .map(col => `  - ${col.column} (${col.type})`)
//         .join('\n');
//       return `Table: ${table}\n${columnDefs}`;
//     })
//     .join('\n\n');

//   const prompt = `You are a SQL expert. Convert the following natural language query into a SQL query.

// Database Schema:
// ${schemaText}

// Natural Language Query: ${naturalLanguageQuery}

// Rules:
// 1. Generate ONLY the SQL query, no explanations
// 2. Use proper PostgreSQL syntax
// 3. Use table and column names exactly as shown in the schema
// 4. For SELECT queries, limit results to 100 rows unless specified
// 5. Be careful with JOIN conditions
// 6. IMPORTANT: Use ILIKE (case-insensitive) instead of LIKE for text comparisons, and use LOWER() function for exact text matches to make searches case-insensitive
// 7. For text comparisons, always use: LOWER(column_name) = LOWER('value') OR column_name ILIKE 'value'
// 8. Return ONLY the SQL query without any markdown formatting or additional text

// SQL Query:`;

//   try {
//     const result = await model.generateContent(prompt);
//     const response = await result.response;
//     let sqlQuery = response.text().trim();
    
//     sqlQuery = sqlQuery.replace(/```sql\n?/g, '').replace(/```\n?/g, '').trim();
    
//     return sqlQuery;
//   } catch (error) {
//     console.error('Error generating SQL:', error);
//     throw error;
//   }
// }

// async function executeSQL(sqlQuery) {
//   const trimmedQuery = sqlQuery.trim().toUpperCase();
//   if (!trimmedQuery.startsWith('SELECT')) {
//     throw new Error('Only SELECT queries are allowed for safety reasons');
//   }
  
//   const client = await pool.connect();
//   try {
//     const result = await client.query(sqlQuery);
//     return result.rows;
//   } catch (error) {
//     console.error('Error executing SQL:', error);
//     throw error;
//   } finally {
//     client.release();
//   }
// }

// // ============= AI-Powered Chart Detection =============

// async function analyzeForVisualization(query, results, sqlQuery) {
//   if (!results || results.length === 0) {
//     return { shouldVisualize: false };
//   }

//   // Get column information
//   const columns = Object.keys(results[0]);
//   const sampleData = results.slice(0, 5);
  
//   const columnTypes = columns.map(col => {
//     const sampleValue = results[0][col];
//     return {
//       name: col,
//       type: typeof sampleValue === 'number' ? 'numeric' : 
//             sampleValue instanceof Date ? 'date' : 'text',
//       sampleValues: sampleData.map(row => row[col]).slice(0, 3)
//     };
//   });

//   const prompt = `You are a data visualization expert. Analyze this query and data to determine if a chart would be helpful.

// User Query: "${query}"

// SQL Query: ${sqlQuery}

// Data Structure:
// - Row Count: ${results.length}
// - Columns: ${JSON.stringify(columnTypes, null, 2)}

// Sample Data (first 3 rows):
// ${JSON.stringify(sampleData, null, 2)}

// Analyze and respond in this EXACT JSON format (no additional text):
// {
//   "shouldVisualize": true/false,
//   "chartType": "bar" | "line" | "pie" | null,
//   "reasoning": "brief explanation",
//   "xAxis": "column name for x-axis or labels",
//   "yAxis": "column name for y-axis or values"
// }

// Guidelines:
// - Use BAR charts for: comparisons, rankings, top N queries, counts by category
// - Use LINE charts for: time series, trends over time, sequential data
// - Use PIE charts for: proportions, distributions, percentages, market share
// - Set shouldVisualize to true if:
//   * Data shows comparisons between entities
//   * There are rankings or top N results
//   * Data represents distributions or proportions
//   * There are trends or patterns over time
//   * Numeric values across categories
// - Set shouldVisualize to false if:
//   * Single value result
//   * Detailed record listings
//   * Text-heavy results
//   * Less than 2 rows
//   * Query asks for specific details not suitable for charts

// Respond ONLY with valid JSON, no other text.`;

//   try {
//     const result = await model.generateContent(prompt);
//     const response = await result.response;
//     let analysisText = response.text().trim();
    
//     // Clean up the response
//     analysisText = analysisText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
//     const analysis = JSON.parse(analysisText);
//     console.log('📊 Visualization Analysis:', analysis);
    
//     return analysis;
//   } catch (error) {
//     console.error('Error analyzing for visualization:', error);
//     return { shouldVisualize: false };
//   }
// }

// // ============= Enhanced Answer Generation =============

// async function generateIntelligentAnswer(rows, sqlQuery, originalQuery, visualizationPlan) {
//   if (rows.length === 0) {
//     return 'No results found for your query.';
//   }

//   const dataString = JSON.stringify(rows.slice(0, 20), null, 2);
  
//   const vizContext = visualizationPlan.shouldVisualize 
//     ? `\n\nNote: A ${visualizationPlan.chartType} chart will be displayed to visualize this data.`
//     : '';

//   const prompt = `You are an intelligent data analyst assistant. Analyze the query results and provide a natural, conversational answer.

// User's Question: "${originalQuery}"

// Query Results (${rows.length} total rows):
// ${dataString}

// ${vizContext}

// Instructions:
// 1. Provide a natural, conversational answer as if you're talking to a colleague
// 2. Start with a direct answer to their question
// 3. Include key insights and interesting findings
// 4. Use emojis thoughtfully to make it engaging (📊 for stats, 🏆 for leaders, 📈 for growth, etc.)
// 5. Format numbers with commas for readability
// 6. If there's a chart, mention it naturally in your response
// 7. Keep it concise but informative - aim for 3-5 sentences unless the data requires more explanation
// 8. Don't mention SQL, databases, or technical details
// 9. Sound like an AI assistant, not a formal report

// Your response:`;

//   try {
//     const result = await model.generateContent(prompt);
//     const response = await result.response;
//     return response.text().trim();
//   } catch (error) {
//     console.error('Error generating answer:', error);
//     return formatResults(rows, sqlQuery);
//   }
// }

// function formatResults(rows, sqlQuery) {
//   if (rows.length === 0) {
//     return 'No results found.';
//   }
  
//   const rowCount = rows.length;
//   const columns = Object.keys(rows[0]);
  
//   const formatColumnName = (col) => {
//     return col.split('_')
//       .map(word => word.charAt(0).toUpperCase() + word.slice(1))
//       .join(' ');
//   };
  
//   const formatValue = (value, key) => {
//     if (value === null || value === undefined) return 'N/A';
    
//     if (value instanceof Date) {
//       return value.toLocaleDateString('en-US', { 
//         year: 'numeric', 
//         month: 'short', 
//         day: 'numeric' 
//       });
//     }
    
//     if (typeof value === 'number' && (key.includes('view') || key.includes('like') || key.includes('comment') || key.includes('follower') || key.includes('sum') || key.includes('total') || key.includes('count'))) {
//       return value.toLocaleString();
//     }
    
//     return value;
//   };
  
//   let response = '';
  
//   const displayLimit = Math.min(10, rowCount);
//   rows.slice(0, displayLimit).forEach((row, idx) => {
//     response += `Result ${idx + 1}:\n`;
//     columns.forEach(col => {
//       const formattedName = formatColumnName(col);
//       const formattedValue = formatValue(row[col], col);
//       response += `  ${formattedName}: ${formattedValue}\n`;
//     });
//     response += '\n';
//   });
  
//   if (rowCount > displayLimit) {
//     response += `... and ${rowCount - displayLimit} more result${rowCount - displayLimit > 1 ? 's' : ''}`;
//   }
  
//   return response;
// }

// // ============= Excel Export Function =============

// async function generateExcel(rows, query) {
//   const workbook = new ExcelJS.Workbook();
//   const worksheet = workbook.addWorksheet('Query Results');
  
//   if (rows.length === 0) {
//     worksheet.addRow(['No results found']);
//     return workbook;
//   }
  
//   const columns = Object.keys(rows[0]);
  
//   const formatColumnName = (col) => {
//     return col.split('_')
//       .map(word => word.charAt(0).toUpperCase() + word.slice(1))
//       .join(' ');
//   };
  
//   const headerRow = worksheet.addRow(columns.map(formatColumnName));
//   headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
//   headerRow.fill = {
//     type: 'pattern',
//     pattern: 'solid',
//     fgColor: { argb: 'FF4472C4' }
//   };
//   headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  
//   rows.forEach(row => {
//     const values = columns.map(col => {
//       const value = row[col];
//       if (value === null || value === undefined) return 'N/A';
//       if (value instanceof Date) return value;
//       return value;
//     });
//     worksheet.addRow(values);
//   });
  
//   worksheet.columns.forEach((column, index) => {
//     let maxLength = 0;
//     column.eachCell({ includeEmpty: true }, (cell) => {
//       const columnLength = cell.value ? cell.value.toString().length : 10;
//       if (columnLength > maxLength) {
//         maxLength = columnLength;
//       }
//     });
//     column.width = Math.min(maxLength + 2, 50);
//   });
  
//   worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
//     row.eachCell({ includeEmpty: false }, (cell) => {
//       cell.border = {
//         top: { style: 'thin' },
//         left: { style: 'thin' },
//         bottom: { style: 'thin' },
//         right: { style: 'thin' }
//       };
//     });
//   });
  
//   const metaSheet = workbook.addWorksheet('Query Info');
//   metaSheet.addRow(['Query', query]);
//   metaSheet.addRow(['Generated', new Date().toLocaleString()]);
//   metaSheet.addRow(['Total Rows', rows.length]);
//   metaSheet.getColumn(1).width = 15;
//   metaSheet.getColumn(2).width = 50;
  
//   return workbook;
// }

// // ============= Routes =============

// app.get('/', (req, res) => {
//   res.json({ 
//     message: 'AI-Powered Backend API is running',
//     endpoints: {
//       health: '/health',
//       nlToSql: '/api/nl-query',
//       schema: '/api/schema',
//       exportExcel: '/api/export-excel'
//     }
//   });
// });

// app.get('/health', (req, res) => {
//   res.json({ status: 'healthy', timestamp: new Date().toISOString() });
// });

// app.get('/api/schema', async (req, res) => {
//   try {
//     const schema = await getDatabaseSchema();
//     res.json({ success: true, schema });
//   } catch (error) {
//     console.error('Error fetching schema:', error);
//     res.status(500).json({ 
//       success: false, 
//       error: 'Failed to fetch database schema' 
//     });
//   }
// });

// app.post('/api/nl-query', async (req, res) => {
//   try {
//     const { query } = req.body;
    
//     if (!query) {
//       return res.status(400).json({
//         success: false,
//         error: 'Query is required'
//       });
//     }
    
//     console.log('📝 Received query:', query);
    
//     // Step 1: Get schema
//     const schema = await getDatabaseSchema();
//     console.log('📊 Schema fetched');
    
//     // Step 2: Generate SQL
//     const sqlQuery = await generateSQL(query, schema);
//     console.log('🔧 Generated SQL:', sqlQuery);
    
//     // Step 3: Execute query
//     const results = await executeSQL(sqlQuery);
//     console.log('✅ Query executed, rows:', results.length);
    
//     // Step 4: AI analyzes if visualization is needed
//     const visualizationPlan = await analyzeForVisualization(query, results, sqlQuery);
//     console.log('🎨 Visualization plan:', visualizationPlan);
    
//     // Step 5: Generate intelligent answer
//     const answer = await generateIntelligentAnswer(results, sqlQuery, query, visualizationPlan);
    
//     // Determine if results are exportable
//     const hasExportableData = results.length > 0 && typeof results[0] === 'object';
    
//     res.json({
//       success: true,
//       answer,
//       sql: sqlQuery,
//       results: results.slice(0, 100),
//       rowCount: results.length,
//       hasExport: hasExportableData,
//       query: query,
//       visualization: visualizationPlan.shouldVisualize ? {
//         enabled: true,
//         chartType: visualizationPlan.chartType,
//         xAxis: visualizationPlan.xAxis,
//         yAxis: visualizationPlan.yAxis,
//         reasoning: visualizationPlan.reasoning
//       } : { enabled: false }
//     });
    
//   } catch (error) {
//     console.error('❌ Error processing query:', error);
//     res.status(500).json({
//       success: false,
//       error: error.message
//     });
//   }
// });

// app.post('/api/export-excel', async (req, res) => {
//   try {
//     const { sql, query } = req.body;
    
//     if (!sql) {
//       return res.status(400).json({
//         success: false,
//         error: 'SQL query is required'
//       });
//     }
    
//     console.log('📊 Exporting to Excel:', sql);
    
//     const results = await executeSQL(sql);
    
//     if (results.length === 0) {
//       return res.status(400).json({
//         success: false,
//         error: 'No data to export'
//       });
//     }
    
//     const workbook = await generateExcel(results, query || 'Query Results');
    
//     res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
//     res.setHeader('Content-Disposition', `attachment; filename=query_results_${Date.now()}.xlsx`);
    
//     await workbook.xlsx.write(res);
//     res.end();
    
//     console.log('✅ Excel file generated successfully');
    
//   } catch (error) {
//     console.error('❌ Error exporting to Excel:', error);
//     res.status(500).json({
//       success: false,
//       error: error.message
//     });
//   }
// });

// // Graceful shutdown
// process.on('SIGTERM', () => {
//   console.log('SIGTERM signal received: closing HTTP server');
//   pool.end(() => {
//     console.log('Database pool closed');
//   });
// });

// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => {
//   console.log(`🚀 AI-Powered Server running on port ${PORT}`);
//   console.log(`📍 http://localhost:${PORT}`);
// });

// module.exports = app;


// const express = require('express');
// const cors = require('cors');
// const { GoogleGenerativeAI } = require('@google/generative-ai');
// const { Pool } = require('pg');
// const ExcelJS = require('exceljs');
// require('dotenv').config();

// const app = express();

// // Middleware
// app.use(cors());
// app.use(express.json());

// // Initialize Gemini AI
// const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
// const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

// // Initialize PostgreSQL connection
// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
//   max: 20,
//   idleTimeoutMillis: 30000,
//   connectionTimeoutMillis: 10000,
//   keepAlive: true,
//   keepAliveInitialDelayMs: 10000
// });

// pool.on('error', (err, client) => {
//   console.error('❌ Unexpected error on idle client', err);
// });

// pool.connect()
//   .then(client => {
//     console.log('✅ Database connected successfully');
//     client.release();
//   })
//   .catch(err => {
//     console.error('❌ Database connection error:', err.message);
//   });

// // ============= NL-to-SQL Functions =============

// async function getDatabaseSchema() {
//   const client = await pool.connect();
//   try {
//     const query = `
//       SELECT 
//         table_name,
//         column_name,
//         data_type,
//         is_nullable
//       FROM information_schema.columns
//       WHERE table_schema = 'public'
//       ORDER BY table_name, ordinal_position;
//     `;
    
//     const result = await client.query(query);
    
//     const schemaByTable = {};
//     result.rows.forEach(row => {
//       if (!schemaByTable[row.table_name]) {
//         schemaByTable[row.table_name] = [];
//       }
//       schemaByTable[row.table_name].push({
//         column: row.column_name,
//         type: row.data_type,
//         nullable: row.is_nullable === 'YES'
//       });
//     });
    
//     return schemaByTable;
//   } catch (error) {
//     console.error('Error fetching schema:', error);
//     throw error;
//   } finally {
//     client.release();
//   }
// }

// async function generateSQL(naturalLanguageQuery, schema) {
//   const schemaText = Object.entries(schema)
//     .map(([table, columns]) => {
//       const columnDefs = columns
//         .map(col => `  - ${col.column} (${col.type})`)
//         .join('\n');
//       return `Table: ${table}\n${columnDefs}`;
//     })
//     .join('\n\n');

//   const prompt = `You are a SQL expert. Convert the following natural language query into a SQL query.

// Database Schema:
// ${schemaText}

// Natural Language Query: ${naturalLanguageQuery}

// Rules:
// 1. Generate ONLY the SQL query, no explanations or comments
// 2. Use proper PostgreSQL syntax
// 3. Use table and column names exactly as shown in the schema
// 4. For SELECT queries, limit results to 100 rows unless specified
// 5. Be careful with JOIN conditions
// 6. IMPORTANT: Use ILIKE (case-insensitive) instead of LIKE for text comparisons, and use LOWER() function for exact text matches to make searches case-insensitive
// 7. For text comparisons, always use: LOWER(column_name) = LOWER('value') OR column_name ILIKE 'value'
// 8. Return ONLY the SQL query without any markdown formatting, comments (--), or additional text
// 9. Start directly with SELECT, no comments before it

// SQL Query:`;

//   try {
//     const result = await model.generateContent(prompt);
//     const response = await result.response;
//     let sqlQuery = response.text().trim();
    
//     sqlQuery = sqlQuery.replace(/```sql\n?/g, '').replace(/```\n?/g, '').trim();
    
//     return sqlQuery;
//   } catch (error) {
//     console.error('Error generating SQL:', error);
//     throw error;
//   }
// }

// async function executeSQL(sqlQuery) {
//   // Remove comments and get the actual SQL query
//   const cleanedQuery = sqlQuery
//     .split('\n')
//     .filter(line => !line.trim().startsWith('--'))
//     .join('\n')
//     .trim();
  
//   const upperQuery = cleanedQuery.toUpperCase();
//   if (!upperQuery.startsWith('SELECT')) {
//     throw new Error('Only SELECT queries are allowed for safety reasons');
//   }
  
//   const client = await pool.connect();
//   try {
//     const result = await client.query(cleanedQuery);
//     return result.rows;
//   } catch (error) {
//     console.error('Error executing SQL:', error);
//     throw error;
//   } finally {
//     client.release();
//   }
// }

// // ============= AI-Powered Chart Detection =============

// async function analyzeForVisualization(query, results, sqlQuery) {
//   if (!results || results.length === 0) {
//     return { shouldVisualize: false };
//   }

//   // Get column information
//   const columns = Object.keys(results[0]);
//   const sampleData = results.slice(0, 5);
  
//   const columnTypes = columns.map(col => {
//     const sampleValue = results[0][col];
//     return {
//       name: col,
//       type: typeof sampleValue === 'number' ? 'numeric' : 
//             sampleValue instanceof Date ? 'date' : 'text',
//       sampleValues: sampleData.map(row => row[col]).slice(0, 3)
//     };
//   });

//   const prompt = `You are a data visualization expert. Analyze this query and data to determine if a chart would be helpful.

// User Query: "${query}"

// SQL Query: ${sqlQuery}

// Data Structure:
// - Row Count: ${results.length}
// - Columns: ${JSON.stringify(columnTypes, null, 2)}

// Sample Data (first 3 rows):
// ${JSON.stringify(sampleData, null, 2)}

// Analyze and respond in this EXACT JSON format (no additional text):
// {
//   "shouldVisualize": true/false,
//   "chartType": "bar" | "line" | "pie" | null,
//   "reasoning": "brief explanation",
//   "xAxis": "column name for x-axis or labels",
//   "yAxis": "column name for y-axis or values"
// }

// Guidelines:
// - Use BAR charts for: comparisons, rankings, top N queries, counts by category
// - Use LINE charts for: time series, trends over time, sequential data
// - Use PIE charts for: proportions, distributions, percentages, market share
// - Set shouldVisualize to true if:
//   * Data shows comparisons between entities
//   * There are rankings or top N results
//   * Data represents distributions or proportions
//   * There are trends or patterns over time
//   * Numeric values across categories
// - Set shouldVisualize to false if:
//   * Single value result
//   * Detailed record listings
//   * Text-heavy results
//   * Less than 2 rows
//   * Query asks for specific details not suitable for charts

// Respond ONLY with valid JSON, no other text.`;

//   try {
//     const result = await model.generateContent(prompt);
//     const response = await result.response;
//     let analysisText = response.text().trim();
    
//     // Clean up the response
//     analysisText = analysisText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
//     const analysis = JSON.parse(analysisText);
//     console.log('📊 Visualization Analysis:', analysis);
    
//     return analysis;
//   } catch (error) {
//     console.error('Error analyzing for visualization:', error);
//     return { shouldVisualize: false };
//   }
// }

// // ============= Enhanced Answer Generation =============

// async function generateIntelligentAnswer(rows, sqlQuery, originalQuery, visualizationPlan) {
//   if (rows.length === 0) {
//     return 'No results found for your query.';
//   }

//   const dataString = JSON.stringify(rows.slice(0, 20), null, 2);
  
//   const vizContext = visualizationPlan.shouldVisualize 
//     ? `\n\nNote: A ${visualizationPlan.chartType} chart will be displayed to visualize this data.`
//     : '';

//   const prompt = `You are an intelligent data analyst assistant. Analyze the query results and provide a natural, conversational answer.

// User's Question: "${originalQuery}"

// Query Results (${rows.length} total rows):
// ${dataString}

// ${vizContext}

// Instructions:
// 1. Provide a natural, conversational answer as if you're talking to a colleague
// 2. Start with a direct answer to their question
// 3. Include key insights and interesting findings
// 4. Use emojis thoughtfully to make it engaging (📊 for stats, 🏆 for leaders, 📈 for growth, etc.)
// 5. Format numbers with commas for readability
// 6. If there's a chart, mention it naturally in your response
// 7. Keep it concise but informative - aim for 3-5 sentences unless the data requires more explanation
// 8. Don't mention SQL, databases, or technical details
// 9. Sound like an AI assistant, not a formal report

// Your response:`;

//   try {
//     const result = await model.generateContent(prompt);
//     const response = await result.response;
//     return response.text().trim();
//   } catch (error) {
//     console.error('Error generating answer:', error);
//     return formatResults(rows, sqlQuery);
//   }
// }

// function formatResults(rows, sqlQuery) {
//   if (rows.length === 0) {
//     return 'No results found.';
//   }
  
//   const rowCount = rows.length;
//   const columns = Object.keys(rows[0]);
  
//   const formatColumnName = (col) => {
//     return col.split('_')
//       .map(word => word.charAt(0).toUpperCase() + word.slice(1))
//       .join(' ');
//   };
  
//   const formatValue = (value, key) => {
//     if (value === null || value === undefined) return 'N/A';
    
//     if (value instanceof Date) {
//       return value.toLocaleDateString('en-US', { 
//         year: 'numeric', 
//         month: 'short', 
//         day: 'numeric' 
//       });
//     }
    
//     if (typeof value === 'number' && (key.includes('view') || key.includes('like') || key.includes('comment') || key.includes('follower') || key.includes('sum') || key.includes('total') || key.includes('count'))) {
//       return value.toLocaleString();
//     }
    
//     return value;
//   };
  
//   let response = '';
  
//   const displayLimit = Math.min(10, rowCount);
//   rows.slice(0, displayLimit).forEach((row, idx) => {
//     response += `Result ${idx + 1}:\n`;
//     columns.forEach(col => {
//       const formattedName = formatColumnName(col);
//       const formattedValue = formatValue(row[col], col);
//       response += `  ${formattedName}: ${formattedValue}\n`;
//     });
//     response += '\n';
//   });
  
//   if (rowCount > displayLimit) {
//     response += `... and ${rowCount - displayLimit} more result${rowCount - displayLimit > 1 ? 's' : ''}`;
//   }
  
//   return response;
// }

// // ============= Excel Export Function =============

// async function generateExcel(rows, query) {
//   const workbook = new ExcelJS.Workbook();
//   const worksheet = workbook.addWorksheet('Query Results');
  
//   if (rows.length === 0) {
//     worksheet.addRow(['No results found']);
//     return workbook;
//   }
  
//   const columns = Object.keys(rows[0]);
  
//   const formatColumnName = (col) => {
//     return col.split('_')
//       .map(word => word.charAt(0).toUpperCase() + word.slice(1))
//       .join(' ');
//   };
  
//   const headerRow = worksheet.addRow(columns.map(formatColumnName));
//   headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
//   headerRow.fill = {
//     type: 'pattern',
//     pattern: 'solid',
//     fgColor: { argb: 'FF4472C4' }
//   };
//   headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  
//   rows.forEach(row => {
//     const values = columns.map(col => {
//       const value = row[col];
//       if (value === null || value === undefined) return 'N/A';
//       if (value instanceof Date) return value;
//       return value;
//     });
//     worksheet.addRow(values);
//   });
  
//   worksheet.columns.forEach((column, index) => {
//     let maxLength = 0;
//     column.eachCell({ includeEmpty: true }, (cell) => {
//       const columnLength = cell.value ? cell.value.toString().length : 10;
//       if (columnLength > maxLength) {
//         maxLength = columnLength;
//       }
//     });
//     column.width = Math.min(maxLength + 2, 50);
//   });
  
//   worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
//     row.eachCell({ includeEmpty: false }, (cell) => {
//       cell.border = {
//         top: { style: 'thin' },
//         left: { style: 'thin' },
//         bottom: { style: 'thin' },
//         right: { style: 'thin' }
//       };
//     });
//   });
  
//   const metaSheet = workbook.addWorksheet('Query Info');
//   metaSheet.addRow(['Query', query]);
//   metaSheet.addRow(['Generated', new Date().toLocaleString()]);
//   metaSheet.addRow(['Total Rows', rows.length]);
//   metaSheet.getColumn(1).width = 15;
//   metaSheet.getColumn(2).width = 50;
  
//   return workbook;
// }

// // ============= Routes =============

// app.get('/', (req, res) => {
//   res.json({ 
//     message: 'AI-Powered Backend API is running',
//     endpoints: {
//       health: '/health',
//       nlToSql: '/api/nl-query',
//       schema: '/api/schema',
//       exportExcel: '/api/export-excel'
//     }
//   });
// });

// app.get('/health', (req, res) => {
//   res.json({ status: 'healthy', timestamp: new Date().toISOString() });
// });

// app.get('/api/schema', async (req, res) => {
//   try {
//     const schema = await getDatabaseSchema();
//     res.json({ success: true, schema });
//   } catch (error) {
//     console.error('Error fetching schema:', error);
//     res.status(500).json({ 
//       success: false, 
//       error: 'Failed to fetch database schema' 
//     });
//   }
// });

// app.post('/api/nl-query', async (req, res) => {
//   try {
//     const { query } = req.body;
    
//     if (!query) {
//       return res.status(400).json({
//         success: false,
//         error: 'Query is required'
//       });
//     }
    
//     console.log('📝 Received query:', query);
    
//     // Step 1: Get schema
//     const schema = await getDatabaseSchema();
//     console.log('📊 Schema fetched');
    
//     // Step 2: Generate SQL
//     const sqlQuery = await generateSQL(query, schema);
//     console.log('🔧 Generated SQL:', sqlQuery);
    
//     // Step 3: Execute query
//     const results = await executeSQL(sqlQuery);
//     console.log('✅ Query executed, rows:', results.length);
    
//     // Step 4: AI analyzes if visualization is needed
//     const visualizationPlan = await analyzeForVisualization(query, results, sqlQuery);
//     console.log('🎨 Visualization plan:', visualizationPlan);
    
//     // Step 5: Generate intelligent answer
//     const answer = await generateIntelligentAnswer(results, sqlQuery, query, visualizationPlan);
    
//     // Determine if results are exportable
//     const hasExportableData = results.length > 0 && typeof results[0] === 'object';
    
//     res.json({
//       success: true,
//       answer,
//       sql: sqlQuery,
//       results: results.slice(0, 100),
//       rowCount: results.length,
//       hasExport: hasExportableData,
//       query: query,
//       visualization: visualizationPlan.shouldVisualize ? {
//         enabled: true,
//         chartType: visualizationPlan.chartType,
//         xAxis: visualizationPlan.xAxis,
//         yAxis: visualizationPlan.yAxis,
//         reasoning: visualizationPlan.reasoning
//       } : { enabled: false }
//     });
    
//   } catch (error) {
//     console.error('❌ Error processing query:', error);
//     res.status(500).json({
//       success: false,
//       error: error.message
//     });
//   }
// });

// app.post('/api/export-excel', async (req, res) => {
//   try {
//     const { sql, query } = req.body;
    
//     if (!sql) {
//       return res.status(400).json({
//         success: false,
//         error: 'SQL query is required'
//       });
//     }
    
//     console.log('📊 Exporting to Excel:', sql);
    
//     const results = await executeSQL(sql);
    
//     if (results.length === 0) {
//       return res.status(400).json({
//         success: false,
//         error: 'No data to export'
//       });
//     }
    
//     const workbook = await generateExcel(results, query || 'Query Results');
    
//     res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
//     res.setHeader('Content-Disposition', `attachment; filename=query_results_${Date.now()}.xlsx`);
    
//     await workbook.xlsx.write(res);
//     res.end();
    
//     console.log('✅ Excel file generated successfully');
    
//   } catch (error) {
//     console.error('❌ Error exporting to Excel:', error);
//     res.status(500).json({
//       success: false,
//       error: error.message
//     });
//   }
// });

// // Graceful shutdown
// process.on('SIGTERM', () => {
//   console.log('SIGTERM signal received: closing HTTP server');
//   pool.end(() => {
//     console.log('Database pool closed');
//   });
// });

// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => {
//   console.log(`🚀 AI-Powered Server running on port ${PORT}`);
//   console.log(`📍 http://localhost:${PORT}`);
// });

// module.exports = app;


const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { Pool } = require('pg');
const ExcelJS = require('exceljs');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

// Initialize PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  keepAlive: true,
  keepAliveInitialDelayMs: 10000
});

pool.on('error', (err, client) => {
  console.error('❌ Unexpected error on idle client', err);
});

pool.connect()
  .then(client => {
    console.log('✅ Database connected successfully');
    client.release();
  })
  .catch(err => {
    console.error('❌ Database connection error:', err.message);
  });

// ============= FEATURE CONFIGURATION =============

const FEATURE_SCHEMAS = {
  INSTAGRAM_ANALYZER: {
    tables: ['brands', 'creators', 'posts'],
    description: 'Instagram Analytics Database',
    contextInfo: `
    Database Context:
    - brands: Contains brand information (brand_id, brand_name, isactive)
    - creators: Contains creator/influencer details (creator_id, name, isactive)  
    - posts: Contains Instagram post data (post_id, brand_id, creator_id, caption, views, likes, comments, date_posted, last_update)
    
    Relationships:
    - posts.brand_id → brands.brand_id (which brand the post is about)
    - posts.creator_id → creators.creator_id (which creator made the post)
    `
  },
  MAIN_APP: {
    tables: ['User', 'Topic', 'Chat', 'Notification', 'Organization', 'Whitelist', 'ScrapedData'],
    description: 'Main Application Database',
    contextInfo: 'Chat application with users, topics, and conversations'
  }
};

// ============= Enhanced Schema Functions =============

async function getDatabaseSchema(featureType = 'INSTAGRAM_ANALYZER') {
  const client = await pool.connect();
  try {
    const allowedTables = FEATURE_SCHEMAS[featureType].tables;
    
    // Convert table names to lowercase for case-insensitive comparison
    const tableConditions = allowedTables.map(t => `'${t.toLowerCase()}'`).join(',');
    
    const query = `
      SELECT 
        table_name,
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND LOWER(table_name) IN (${tableConditions})
      ORDER BY table_name, ordinal_position;
    `;
    
    const result = await client.query(query);
    
    if (result.rows.length === 0) {
      console.warn(`⚠️ No tables found for feature: ${featureType}`);
      console.warn(`Looking for tables: ${allowedTables.join(', ')}`);
    }
    
    const schemaByTable = {};
    result.rows.forEach(row => {
      if (!schemaByTable[row.table_name]) {
        schemaByTable[row.table_name] = [];
      }
      schemaByTable[row.table_name].push({
        column: row.column_name,
        type: row.data_type,
        nullable: row.is_nullable === 'YES',
        default: row.column_default
      });
    });
    
    console.log(`📊 Schema loaded for ${featureType}:`, Object.keys(schemaByTable));
    return schemaByTable;
  } catch (error) {
    console.error('Error fetching schema:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function generateSQL(naturalLanguageQuery, schema, featureType) {
  const schemaText = Object.entries(schema)
    .map(([table, columns]) => {
      const columnDefs = columns
        .map(col => `  - ${col.column} (${col.type})`)
        .join('\n');
      return `Table: ${table}\n${columnDefs}`;
    })
    .join('\n\n');

  const featureContext = FEATURE_SCHEMAS[featureType].contextInfo;

  const prompt = `You are a SQL expert. Convert the following natural language query into a SQL query.

${featureContext}

Database Schema (ONLY use these tables):
${schemaText}

Natural Language Query: ${naturalLanguageQuery}

Rules:
1. Generate ONLY the SQL query, no explanations or comments
2. Use proper PostgreSQL syntax
3. Use ONLY the tables shown above - DO NOT reference any other tables
4. Use table and column names EXACTLY as shown in the schema
5. For SELECT queries, limit results to 100 rows unless specified
6. Be careful with JOIN conditions - use the relationships described in context
7. IMPORTANT: Use ILIKE (case-insensitive) instead of LIKE for text comparisons
8. For text comparisons, use: LOWER(column_name) = LOWER('value') OR column_name ILIKE '%value%'
9. Return ONLY the SQL query without any markdown formatting, comments (--), or additional text
10. Start directly with SELECT, no comments before it
11. For aggregations (top creators, most views, etc.), use proper GROUP BY and ORDER BY
12. When joining posts with brands or creators, use the foreign key relationships

Common Query Patterns:
- Top creators by views: SELECT c.name, SUM(p.views) FROM creators c JOIN posts p ON c.creator_id = p.creator_id GROUP BY c.creator_id, c.name ORDER BY SUM(p.views) DESC
- Posts by brand: SELECT * FROM posts WHERE brand_id = (SELECT brand_id FROM brands WHERE brand_name ILIKE '%brand%')
- Engagement metrics: Calculate using views, likes, comments from posts table

SQL Query:`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let sqlQuery = response.text().trim();
    
    sqlQuery = sqlQuery.replace(/```sql\n?/g, '').replace(/```\n?/g, '').trim();
    
    return sqlQuery;
  } catch (error) {
    console.error('Error generating SQL:', error);
    throw error;
  }
}

async function executeSQL(sqlQuery) {
  const cleanedQuery = sqlQuery
    .split('\n')
    .filter(line => !line.trim().startsWith('--'))
    .join('\n')
    .trim();
  
  const upperQuery = cleanedQuery.toUpperCase();
  if (!upperQuery.startsWith('SELECT')) {
    throw new Error('Only SELECT queries are allowed for safety reasons');
  }
  
  const client = await pool.connect();
  try {
    const result = await client.query(cleanedQuery);
    return result.rows;
  } catch (error) {
    console.error('Error executing SQL:', error);
    throw error;
  } finally {
    client.release();
  }
}

// ============= AI-Powered Chart Detection =============

async function analyzeForVisualization(query, results, sqlQuery) {
  if (!results || results.length === 0) {
    return { shouldVisualize: false };
  }

  const columns = Object.keys(results[0]);
  const sampleData = results.slice(0, 5);
  
  const columnTypes = columns.map(col => {
    const sampleValue = results[0][col];
    return {
      name: col,
      type: typeof sampleValue === 'number' ? 'numeric' : 
            sampleValue instanceof Date ? 'date' : 'text',
      sampleValues: sampleData.map(row => row[col]).slice(0, 3)
    };
  });

  const prompt = `You are a data visualization expert. Analyze this query and data to determine if a chart would be helpful.

User Query: "${query}"

SQL Query: ${sqlQuery}

Data Structure:
- Row Count: ${results.length}
- Columns: ${JSON.stringify(columnTypes, null, 2)}

Sample Data (first 3 rows):
${JSON.stringify(sampleData, null, 2)}

Analyze and respond in this EXACT JSON format (no additional text):
{
  "shouldVisualize": true/false,
  "chartType": "bar" | "line" | "pie" | null,
  "reasoning": "brief explanation",
  "xAxis": "column name for x-axis or labels",
  "yAxis": "column name for y-axis or values"
}

Guidelines:
- Use BAR charts for: comparisons, rankings, top N queries, counts by category
- Use LINE charts for: time series, trends over time, sequential data
- Use PIE charts for: proportions, distributions, percentages, market share
- Set shouldVisualize to true if data shows meaningful patterns
- Set shouldVisualize to false if single value, detailed listings, or text-heavy results
- For xAxis: pick the categorical column (name, brand_name, creator name, etc.)
- For yAxis: pick the numeric column (views, likes, comments, sum, count, etc.)

Respond ONLY with valid JSON, no other text.`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let analysisText = response.text().trim();
    
    analysisText = analysisText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    const analysis = JSON.parse(analysisText);
    console.log('📊 Visualization Analysis:', analysis);
    
    return analysis;
  } catch (error) {
    console.error('Error analyzing for visualization:', error);
    return { shouldVisualize: false };
  }
}

// ============= Enhanced Answer Generation =============

async function generateIntelligentAnswer(rows, sqlQuery, originalQuery, visualizationPlan) {
  if (rows.length === 0) {
    return 'No results found for your query.';
  }

  const dataString = JSON.stringify(rows.slice(0, 20), null, 2);
  
  const vizContext = visualizationPlan.shouldVisualize 
    ? `\n\nNote: A ${visualizationPlan.chartType} chart will be displayed to visualize this data.`
    : '';

  const prompt = `You are an intelligent Instagram analytics assistant. Analyze the query results and provide a natural, conversational answer.

User's Question: "${originalQuery}"

Query Results (${rows.length} total rows):
${dataString}

${vizContext}

Instructions:
1. Provide a natural, conversational answer as if you're talking to a marketing manager
2. Start with a direct answer to their question
3. Include key insights about creators, brands, engagement, or trends
4. Use emojis thoughtfully (📸 for posts, 👤 for creators, 🏆 for top performers, 📊 for stats, 📈 for growth, 💬 for engagement)
5. Format numbers with commas for readability (views, likes, comments)
6. If there's a chart, mention it naturally in your response
7. Keep it concise but informative - aim for 3-5 sentences unless the data requires more
8. Don't mention SQL, databases, or technical details
9. Focus on actionable insights for Instagram marketing

Your response:`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  } catch (error) {
    console.error('Error generating answer:', error);
    return formatResults(rows, sqlQuery);
  }
}

function formatResults(rows, sqlQuery) {
  if (rows.length === 0) {
    return 'No results found.';
  }
  
  const rowCount = rows.length;
  const columns = Object.keys(rows[0]);
  
  const formatColumnName = (col) => {
    return col.split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };
  
  const formatValue = (value, key) => {
    if (value === null || value === undefined) return 'N/A';
    
    if (value instanceof Date) {
      return value.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    }
    
    if (typeof value === 'number' && (key.includes('view') || key.includes('like') || key.includes('comment') || key.includes('sum') || key.includes('total') || key.includes('count'))) {
      return value.toLocaleString();
    }
    
    return value;
  };
  
  let response = '';
  
  const displayLimit = Math.min(10, rowCount);
  rows.slice(0, displayLimit).forEach((row, idx) => {
    response += `Result ${idx + 1}:\n`;
    columns.forEach(col => {
      const formattedName = formatColumnName(col);
      const formattedValue = formatValue(row[col], col);
      response += `  ${formattedName}: ${formattedValue}\n`;
    });
    response += '\n';
  });
  
  if (rowCount > displayLimit) {
    response += `... and ${rowCount - displayLimit} more result${rowCount - displayLimit > 1 ? 's' : ''}`;
  }
  
  return response;
}

// ============= Excel Export Function =============

async function generateExcel(rows, query) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Query Results');
  
  if (rows.length === 0) {
    worksheet.addRow(['No results found']);
    return workbook;
  }
  
  const columns = Object.keys(rows[0]);
  
  const formatColumnName = (col) => {
    return col.split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };
  
  const headerRow = worksheet.addRow(columns.map(formatColumnName));
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' }
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  
  rows.forEach(row => {
    const values = columns.map(col => {
      const value = row[col];
      if (value === null || value === undefined) return 'N/A';
      if (value instanceof Date) return value;
      return value;
    });
    worksheet.addRow(values);
  });
  
  worksheet.columns.forEach((column, index) => {
    let maxLength = 0;
    column.eachCell({ includeEmpty: true }, (cell) => {
      const columnLength = cell.value ? cell.value.toString().length : 10;
      if (columnLength > maxLength) {
        maxLength = columnLength;
      }
    });
    column.width = Math.min(maxLength + 2, 50);
  });
  
  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    row.eachCell({ includeEmpty: false }, (cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
  });
  
  const metaSheet = workbook.addWorksheet('Query Info');
  metaSheet.addRow(['Query', query]);
  metaSheet.addRow(['Generated', new Date().toLocaleString()]);
  metaSheet.addRow(['Total Rows', rows.length]);
  metaSheet.getColumn(1).width = 15;
  metaSheet.getColumn(2).width = 50;
  
  return workbook;
}

// ============= Routes =============

app.get('/', (req, res) => {
  res.json({ 
    message: 'AI-Powered Instagram Analytics API is running',
    features: Object.keys(FEATURE_SCHEMAS),
    endpoints: {
      health: '/health',
      nlToSql: '/api/nl-query',
      schema: '/api/schema',
      exportExcel: '/api/export-excel',
      features: '/api/features'
    }
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Get available features
app.get('/api/features', (req, res) => {
  res.json({ 
    success: true, 
    features: Object.entries(FEATURE_SCHEMAS).map(([key, value]) => ({
      id: key,
      description: value.description,
      tables: value.tables
    }))
  });
});

// Get schema for specific feature
app.get('/api/schema', async (req, res) => {
  try {
    const featureType = req.query.feature || 'INSTAGRAM_ANALYZER';
    
    if (!FEATURE_SCHEMAS[featureType]) {
      return res.status(400).json({
        success: false,
        error: `Invalid feature type. Available: ${Object.keys(FEATURE_SCHEMAS).join(', ')}`
      });
    }
    
    const schema = await getDatabaseSchema(featureType);
    res.json({ 
      success: true, 
      feature: featureType,
      schema 
    });
  } catch (error) {
    console.error('Error fetching schema:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch database schema' 
    });
  }
});

// Enhanced NL Query with feature support
app.post('/api/nl-query', async (req, res) => {
  try {
    const { query, feature = 'INSTAGRAM_ANALYZER' } = req.body;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query is required'
      });
    }

    if (!FEATURE_SCHEMAS[feature]) {
      return res.status(400).json({
        success: false,
        error: `Invalid feature type. Available: ${Object.keys(FEATURE_SCHEMAS).join(', ')}`
      });
    }
    
    console.log(`📝 [${feature}] Received query:`, query);
    
    // Step 1: Get schema for specific feature
    const schema = await getDatabaseSchema(feature);
    console.log(`📊 [${feature}] Schema fetched:`, Object.keys(schema));
    
    if (Object.keys(schema).length === 0) {
      return res.status(404).json({
        success: false,
        error: `No tables found for feature: ${feature}. Tables needed: ${FEATURE_SCHEMAS[feature].tables.join(', ')}`
      });
    }
    
    // Step 2: Generate SQL
    const sqlQuery = await generateSQL(query, schema, feature);
    console.log('🔧 Generated SQL:', sqlQuery);
    
    // Step 3: Execute query
    const results = await executeSQL(sqlQuery);
    console.log('✅ Query executed, rows:', results.length);
    
    // Step 4: AI analyzes if visualization is needed
    const visualizationPlan = await analyzeForVisualization(query, results, sqlQuery);
    console.log('🎨 Visualization plan:', visualizationPlan);
    
    // Step 5: Generate intelligent answer
    const answer = await generateIntelligentAnswer(results, sqlQuery, query, visualizationPlan);
    
    // Determine if results are exportable
    const hasExportableData = results.length > 0 && typeof results[0] === 'object';
    
    res.json({
      success: true,
      answer,
      sql: sqlQuery,
      results: results.slice(0, 100),
      rowCount: results.length,
      hasExport: hasExportableData,
      query: query,
      feature: feature,
      visualization: visualizationPlan.shouldVisualize ? {
        enabled: true,
        chartType: visualizationPlan.chartType,
        xAxis: visualizationPlan.xAxis,
        yAxis: visualizationPlan.yAxis,
        reasoning: visualizationPlan.reasoning
      } : { enabled: false }
    });
    
  } catch (error) {
    console.error('❌ Error processing query:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/export-excel', async (req, res) => {
  try {
    const { sql, query } = req.body;
    
    if (!sql) {
      return res.status(400).json({
        success: false,
        error: 'SQL query is required'
      });
    }
    
    console.log('📊 Exporting to Excel:', sql);
    
    const results = await executeSQL(sql);
    
    if (results.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No data to export'
      });
    }
    
    const workbook = await generateExcel(results, query || 'Query Results');
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=instagram_analytics_${Date.now()}.xlsx`);
    
    await workbook.xlsx.write(res);
    res.end();
    
    console.log('✅ Excel file generated successfully');
    
  } catch (error) {
    console.error('❌ Error exporting to Excel:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  pool.end(() => {
    console.log('Database pool closed');
  });
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`🚀 AI-Powered Instagram Analytics Server running on port ${PORT}`);
  console.log(`📍 http://localhost:${PORT}`);
  console.log(`📦 Available features: ${Object.keys(FEATURE_SCHEMAS).join(', ')}`);
  console.log(`📊 Tables: brands, creators, posts`);
});

module.exports = app;
 
// // const express = require('express');
// // const cors = require('cors');
// // const { GoogleGenerativeAI } = require('@google/generative-ai');
// // const { Pool } = require('pg');
// // require('dotenv').config();

// // const app = express();

// // // Middleware
// // app.use(cors());
// // app.use(express.json());

// // // Initialize Gemini AI
// // const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
// // const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

// // // Initialize PostgreSQL connection with better configuration
// // const pool = new Pool({
// //   connectionString: process.env.DATABASE_URL,
// //   ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
// //   max: 20, // Maximum number of clients in the pool
// //   idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
// //   connectionTimeoutMillis: 10000, // Return an error after 10 seconds if connection could not be established
// //   keepAlive: true,
// //   keepAliveInitialDelayMs: 10000
// // });

// // // Handle pool errors
// // pool.on('error', (err, client) => {
// //   console.error('❌ Unexpected error on idle client', err);
// // });

// // // Test database connection
// // pool.connect()
// //   .then(client => {
// //     console.log('✅ Database connected successfully');
// //     client.release();
// //   })
// //   .catch(err => {
// //     console.error('❌ Database connection error:', err.message);
// //   });

// // // ============= NL-to-SQL Functions =============

// // async function getDatabaseSchema() {
// //   const client = await pool.connect();
// //   try {
// //     const query = `
// //       SELECT 
// //         table_name,
// //         column_name,
// //         data_type,
// //         is_nullable
// //       FROM information_schema.columns
// //       WHERE table_schema = 'public'
// //       ORDER BY table_name, ordinal_position;
// //     `;
    
// //     const result = await client.query(query);
    
// //     const schemaByTable = {};
// //     result.rows.forEach(row => {
// //       if (!schemaByTable[row.table_name]) {
// //         schemaByTable[row.table_name] = [];
// //       }
// //       schemaByTable[row.table_name].push({
// //         column: row.column_name,
// //         type: row.data_type,
// //         nullable: row.is_nullable === 'YES'
// //       });
// //     });
    
// //     return schemaByTable;
// //   } catch (error) {
// //     console.error('Error fetching schema:', error);
// //     throw error;
// //   } finally {
// //     client.release();
// //   }
// // }

// // async function generateSQL(naturalLanguageQuery, schema) {
// //   const schemaText = Object.entries(schema)
// //     .map(([table, columns]) => {
// //       const columnDefs = columns
// //         .map(col => `  - ${col.column} (${col.type})`)
// //         .join('\n');
// //       return `Table: ${table}\n${columnDefs}`;
// //     })
// //     .join('\n\n');

// //   const prompt = `You are a SQL expert. Convert the following natural language query into a SQL query.

// // Database Schema:
// // ${schemaText}

// // Natural Language Query: ${naturalLanguageQuery}

// // Rules:
// // 1. Generate ONLY the SQL query, no explanations
// // 2. Use proper PostgreSQL syntax
// // 3. Use table and column names exactly as shown in the schema
// // 4. For SELECT queries, limit results to 100 rows unless specified
// // 5. Be careful with JOIN conditions
// // 6. IMPORTANT: Use ILIKE (case-insensitive) instead of LIKE for text comparisons, and use LOWER() function for exact text matches to make searches case-insensitive
// // 7. For text comparisons, always use: LOWER(column_name) = LOWER('value') OR column_name ILIKE 'value'
// // 8. Return ONLY the SQL query without any markdown formatting or additional text

// // SQL Query:`;

// //   try {
// //     const result = await model.generateContent(prompt);
// //     const response = await result.response;
// //     let sqlQuery = response.text().trim();
    
// //     // Clean up the response
// //     sqlQuery = sqlQuery.replace(/```sql\n?/g, '').replace(/```\n?/g, '').trim();
    
// //     return sqlQuery;
// //   } catch (error) {
// //     console.error('Error generating SQL:', error);
// //     throw error;
// //   }
// // }

// // async function executeSQL(sqlQuery) {
// //   // Basic SQL injection prevention - only allow SELECT queries
// //   const trimmedQuery = sqlQuery.trim().toUpperCase();
// //   if (!trimmedQuery.startsWith('SELECT')) {
// //     throw new Error('Only SELECT queries are allowed for safety reasons');
// //   }
  
// //   const client = await pool.connect();
// //   try {
// //     const result = await client.query(sqlQuery);
// //     return result.rows;
// //   } catch (error) {
// //     console.error('Error executing SQL:', error);
// //     throw error;
// //   } finally {
// //     client.release();
// //   }
// // }

// // async function analyzeAndFormatResults(rows, sqlQuery, originalQuery) {
// //   if (rows.length === 0) {
// //     return 'No results found for your query.';
// //   }
  
// //   // Check if this is a comparison or analytical query
// //   const isComparison = originalQuery.toLowerCase().includes('compare') || 
// //                        originalQuery.toLowerCase().includes('vs') ||
// //                        originalQuery.toLowerCase().includes('versus');
  
// //   const isAggregation = sqlQuery.toUpperCase().includes('SUM(') || 
// //                         sqlQuery.toUpperCase().includes('COUNT(') || 
// //                         sqlQuery.toUpperCase().includes('AVG(') ||
// //                         sqlQuery.toUpperCase().includes('GROUP BY');
  
// //   // If it's a comparison or aggregation, generate an AI summary
// //   if (isComparison || isAggregation || rows.length <= 10) {
// //     try {
// //       const summary = await generateSummary(rows, originalQuery, sqlQuery);
// //       return summary;
// //     } catch (error) {
// //       console.error('Error generating summary, falling back to formatted results:', error);
// //       // Fall back to formatted results if AI fails
// //     }
// //   }
  
// //   // Otherwise, return formatted results
// //   return formatResults(rows, sqlQuery);
// // }

// // async function generateSummary(rows, originalQuery, sqlQuery) {
// //   const dataString = JSON.stringify(rows, null, 2);
  
// //   const prompt = `You are a data analyst. Analyze the following query results and provide a clear, concise summary.

// // Original Question: ${originalQuery}

// // Query Results:
// // ${dataString}

// // Instructions:
// // 1. Provide a natural language answer to the user's question
// // 2. Highlight key insights and comparisons
// // 3. Use emojis to make it engaging (📊 for stats, 🏆 for winners, 📈 for trends)
// // 4. If comparing values, clearly state which is higher/lower
// // 5. Format numbers with commas for readability
// // 6. Keep it concise but informative
// // 7. Don't mention SQL or technical details

// // Summary:`;

// //   try {
// //     const result = await model.generateContent(prompt);
// //     const response = await result.response;
// //     let summary = response.text().trim();
    
// //     // Add the raw data at the end for reference
// //     summary += '\n\n━━━━━━━━━━━━━━━━━━━━\n📋 Detailed Results:\n━━━━━━━━━━━━━━━━━━━━\n\n';
// //     summary += formatResults(rows, sqlQuery);
    
// //     return summary;
// //   } catch (error) {
// //     console.error('Error in generateSummary:', error);
// //     throw error;
// //   }
// // }

// // function formatResults(rows, sqlQuery) {
// //   if (rows.length === 0) {
// //     return 'No results found.';
// //   }
  
// //   const rowCount = rows.length;
// //   const columns = Object.keys(rows[0]);
  
// //   // Format column names to be more readable
// //   const formatColumnName = (col) => {
// //     return col.split('_')
// //       .map(word => word.charAt(0).toUpperCase() + word.slice(1))
// //       .join(' ');
// //   };
  
// //   // Format values
// //   const formatValue = (value, key) => {
// //     if (value === null || value === undefined) return 'N/A';
    
// //     // Format dates
// //     if (value instanceof Date) {
// //       return value.toLocaleDateString('en-US', { 
// //         year: 'numeric', 
// //         month: 'short', 
// //         day: 'numeric' 
// //       });
// //     }
    
// //     // Format large numbers with commas
// //     if (typeof value === 'number' && (key.includes('view') || key.includes('like') || key.includes('comment') || key.includes('follower') || key.includes('sum') || key.includes('total') || key.includes('count'))) {
// //       return value.toLocaleString();
// //     }
    
// //     return value;
// //   };
  
// //   let response = '';
  
// //   const displayLimit = Math.min(10, rowCount);
// //   rows.slice(0, displayLimit).forEach((row, idx) => {
// //     response += `Result ${idx + 1}:\n`;
// //     columns.forEach(col => {
// //       const formattedName = formatColumnName(col);
// //       const formattedValue = formatValue(row[col], col);
// //       response += `  ${formattedName}: ${formattedValue}\n`;
// //     });
// //     response += '\n';
// //   });
  
// //   if (rowCount > displayLimit) {
// //     response += `... and ${rowCount - displayLimit} more result${rowCount - displayLimit > 1 ? 's' : ''}`;
// //   }
  
// //   return response;
// // }

// // // ============= Routes =============

// // app.get('/', (req, res) => {
// //   res.json({ 
// //     message: 'Backend API is running',
// //     endpoints: {
// //       health: '/health',
// //       nlToSql: '/api/nl-query',
// //       schema: '/api/schema'
// //     }
// //   });
// // });

// // app.get('/health', (req, res) => {
// //   res.json({ status: 'healthy', timestamp: new Date().toISOString() });
// // });

// // // Get database schema endpoint
// // app.get('/api/schema', async (req, res) => {
// //   try {
// //     const schema = await getDatabaseSchema();
// //     res.json({ success: true, schema });
// //   } catch (error) {
// //     console.error('Error fetching schema:', error);
// //     res.status(500).json({ 
// //       success: false, 
// //       error: 'Failed to fetch database schema' 
// //     });
// //   }
// // });

// // // Natural Language to SQL endpoint
// // app.post('/api/nl-query', async (req, res) => {
// //   try {
// //     const { query } = req.body;
    
// //     if (!query) {
// //       return res.status(400).json({
// //         success: false,
// //         error: 'Query is required'
// //       });
// //     }
    
// //     console.log('📝 Received query:', query);
    
// //     // Get database schema
// //     const schema = await getDatabaseSchema();
// //     console.log('📊 Schema fetched');
    
// //     // Generate SQL from natural language
// //     const sqlQuery = await generateSQL(query, schema);
// //     console.log('🔧 Generated SQL:', sqlQuery);
    
// //     // Execute SQL query
// //     const results = await executeSQL(sqlQuery);
// //     console.log('✅ Query executed, rows:', results.length);
    
// //     // Format response
// //     const answer = formatResults(results, sqlQuery);
    
// //     res.json({
// //       success: true,
// //       answer,
// //       sql: sqlQuery,
// //       results: results.slice(0, 100),
// //       rowCount: results.length
// //     });
    
// //   } catch (error) {
// //     console.error('❌ Error processing query:', error);
// //     res.status(500).json({
// //       success: false,
// //       error: error.message
// //     });
// //   }
// // });

// // // Graceful shutdown
// // process.on('SIGTERM', () => {
// //   console.log('SIGTERM signal received: closing HTTP server');
// //   pool.end(() => {
// //     console.log('Database pool closed');
// //   });
// // });

// // const PORT = process.env.PORT || 5000;
// // app.listen(PORT, () => {
// //   console.log(`🚀 Server running on port ${PORT}`);
// //   console.log(`📍 http://localhost:${PORT}`);
// // });

// // module.exports = app;


// // const express = require('express');
// // const cors = require('cors');
// // const { GoogleGenerativeAI } = require('@google/generative-ai');
// // const { Pool } = require('pg');
// // const ExcelJS = require('exceljs');
// // require('dotenv').config();

// // const app = express();

// // // Middleware
// // app.use(cors());
// // app.use(express.json());

// // // Initialize Gemini AI
// // const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
// // const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

// // // Initialize PostgreSQL connection with better configuration
// // const pool = new Pool({
// //   connectionString: process.env.DATABASE_URL,
// //   ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
// //   max: 20,
// //   idleTimeoutMillis: 30000,
// //   connectionTimeoutMillis: 10000,
// //   keepAlive: true,
// //   keepAliveInitialDelayMs: 10000
// // });


// // pool.on('error', (err, client) => {
// //   console.error('❌ Unexpected error on idle client', err);
// // });


// // pool.connect()
// //   .then(client => {
// //     console.log('✅ Database connected successfully');
// //     client.release();
// //   })
// //   .catch(err => {
// //     console.error('❌ Database connection error:', err.message);
// //   });

// // // ============= NL-to-SQL Functions =============

// // async function getDatabaseSchema() {
// //   const client = await pool.connect();
// //   try {
// //     const query = `
// //       SELECT 
// //         table_name,
// //         column_name,
// //         data_type,
// //         is_nullable
// //       FROM information_schema.columns
// //       WHERE table_schema = 'public'
// //       ORDER BY table_name, ordinal_position;
// //     `;
    
// //     const result = await client.query(query);
    
// //     const schemaByTable = {};
// //     result.rows.forEach(row => {
// //       if (!schemaByTable[row.table_name]) {
// //         schemaByTable[row.table_name] = [];
// //       }
// //       schemaByTable[row.table_name].push({
// //         column: row.column_name,
// //         type: row.data_type,
// //         nullable: row.is_nullable === 'YES'
// //       });
// //     });
    
// //     return schemaByTable;
// //   } catch (error) {
// //     console.error('Error fetching schema:', error);
// //     throw error;
// //   } finally {
// //     client.release();
// //   }
// // }

// // async function generateSQL(naturalLanguageQuery, schema) {
// //   const schemaText = Object.entries(schema)
// //     .map(([table, columns]) => {
// //       const columnDefs = columns
// //         .map(col => `  - ${col.column} (${col.type})`)
// //         .join('\n');
// //       return `Table: ${table}\n${columnDefs}`;
// //     })
// //     .join('\n\n');

// //   const prompt = `You are a SQL expert. Convert the following natural language query into a SQL query.

// // Database Schema:
// // ${schemaText}

// // Natural Language Query: ${naturalLanguageQuery}

// // Rules:
// // 1. Generate ONLY the SQL query, no explanations
// // 2. Use proper PostgreSQL syntax
// // 3. Use table and column names exactly as shown in the schema
// // 4. For SELECT queries, limit results to 100 rows unless specified
// // 5. Be careful with JOIN conditions
// // 6. IMPORTANT: Use ILIKE (case-insensitive) instead of LIKE for text comparisons, and use LOWER() function for exact text matches to make searches case-insensitive
// // 7. For text comparisons, always use: LOWER(column_name) = LOWER('value') OR column_name ILIKE 'value'
// // 8. Return ONLY the SQL query without any markdown formatting or additional text

// // SQL Query:`;

// //   try {
// //     const result = await model.generateContent(prompt);
// //     const response = await result.response;
// //     let sqlQuery = response.text().trim();
    
// //     sqlQuery = sqlQuery.replace(/```sql\n?/g, '').replace(/```\n?/g, '').trim();
    
// //     return sqlQuery;
// //   } catch (error) {
// //     console.error('Error generating SQL:', error);
// //     throw error;
// //   }
// // }

// // async function executeSQL(sqlQuery) {
// //   const trimmedQuery = sqlQuery.trim().toUpperCase();
// //   if (!trimmedQuery.startsWith('SELECT')) {
// //     throw new Error('Only SELECT queries are allowed for safety reasons');
// //   }
  
// //   const client = await pool.connect();
// //   try {
// //     const result = await client.query(sqlQuery);
// //     return result.rows;
// //   } catch (error) {
// //     console.error('Error executing SQL:', error);
// //     throw error;
// //   } finally {
// //     client.release();
// //   }
// // }

// // async function analyzeAndFormatResults(rows, sqlQuery, originalQuery) {
// //   if (rows.length === 0) {
// //     return 'No results found for your query.';
// //   }
  
// //   const isComparison = originalQuery.toLowerCase().includes('compare') || 
// //                        originalQuery.toLowerCase().includes('vs') ||
// //                        originalQuery.toLowerCase().includes('versus');
  
// //   const isAggregation = sqlQuery.toUpperCase().includes('SUM(') || 
// //                         sqlQuery.toUpperCase().includes('COUNT(') || 
// //                         sqlQuery.toUpperCase().includes('AVG(') ||
// //                         sqlQuery.toUpperCase().includes('GROUP BY');
  
// //   if (isComparison || isAggregation || rows.length <= 10) {
// //     try {
// //       const summary = await generateSummary(rows, originalQuery, sqlQuery);
// //       return summary;
// //     } catch (error) {
// //       console.error('Error generating summary, falling back to formatted results:', error);
// //     }
// //   }
  
// //   return formatResults(rows, sqlQuery);
// // }

// // async function generateSummary(rows, originalQuery, sqlQuery) {
// //   const dataString = JSON.stringify(rows, null, 2);
  
// //   const prompt = `You are a data analyst. Analyze the following query results and provide a clear, concise summary.

// // Original Question: ${originalQuery}

// // Query Results:
// // ${dataString}

// // Instructions:
// // 1. Provide a natural language answer to the user's question
// // 2. Highlight key insights and comparisons
// // 3. Use emojis to make it engaging (📊 for stats, 🏆 for winners, 📈 for trends)
// // 4. If comparing values, clearly state which is higher/lower
// // 5. Format numbers with commas for readability
// // 6. Keep it concise but informative
// // 7. Don't mention SQL or technical details

// // Summary:`;

// //   try {
// //     const result = await model.generateContent(prompt);
// //     const response = await result.response;
// //     let summary = response.text().trim();
    
// //     summary += '\n\n━━━━━━━━━━━━━━━━━━━━\n📋 Detailed Results:\n━━━━━━━━━━━━━━━━━━━━\n\n';
// //     summary += formatResults(rows, sqlQuery);
    
// //     return summary;
// //   } catch (error) {
// //     console.error('Error in generateSummary:', error);
// //     throw error;
// //   }
// // }

// // function formatResults(rows, sqlQuery) {
// //   if (rows.length === 0) {
// //     return 'No results found.';
// //   }
  
// //   const rowCount = rows.length;
// //   const columns = Object.keys(rows[0]);
  
// //   const formatColumnName = (col) => {
// //     return col.split('_')
// //       .map(word => word.charAt(0).toUpperCase() + word.slice(1))
// //       .join(' ');
// //   };
  
// //   const formatValue = (value, key) => {
// //     if (value === null || value === undefined) return 'N/A';
    
// //     if (value instanceof Date) {
// //       return value.toLocaleDateString('en-US', { 
// //         year: 'numeric', 
// //         month: 'short', 
// //         day: 'numeric' 
// //       });
// //     }
    
// //     if (typeof value === 'number' && (key.includes('view') || key.includes('like') || key.includes('comment') || key.includes('follower') || key.includes('sum') || key.includes('total') || key.includes('count'))) {
// //       return value.toLocaleString();
// //     }
    
// //     return value;
// //   };
  
// //   let response = '';
  
// //   const displayLimit = Math.min(10, rowCount);
// //   rows.slice(0, displayLimit).forEach((row, idx) => {
// //     response += `Result ${idx + 1}:\n`;
// //     columns.forEach(col => {
// //       const formattedName = formatColumnName(col);
// //       const formattedValue = formatValue(row[col], col);
// //       response += `  ${formattedName}: ${formattedValue}\n`;
// //     });
// //     response += '\n';
// //   });
  
// //   if (rowCount > displayLimit) {
// //     response += `... and ${rowCount - displayLimit} more result${rowCount - displayLimit > 1 ? 's' : ''}`;
// //   }
  
// //   return response;
// // }

// // // ============= Excel Export Function =============

// // async function generateExcel(rows, query) {
// //   const workbook = new ExcelJS.Workbook();
// //   const worksheet = workbook.addWorksheet('Query Results');
  
// //   if (rows.length === 0) {
// //     worksheet.addRow(['No results found']);
// //     return workbook;
// //   }
  
// //   // Get column names
// //   const columns = Object.keys(rows[0]);
  
// //   // Format column names
// //   const formatColumnName = (col) => {
// //     return col.split('_')
// //       .map(word => word.charAt(0).toUpperCase() + word.slice(1))
// //       .join(' ');
// //   };
  
// //   // Add header row with formatting
// //   const headerRow = worksheet.addRow(columns.map(formatColumnName));
// //   headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
// //   headerRow.fill = {
// //     type: 'pattern',
// //     pattern: 'solid',
// //     fgColor: { argb: 'FF4472C4' }
// //   };
// //   headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  
// //   // Add data rows
// //   rows.forEach(row => {
// //     const values = columns.map(col => {
// //       const value = row[col];
// //       if (value === null || value === undefined) return 'N/A';
// //       if (value instanceof Date) return value;
// //       return value;
// //     });
// //     worksheet.addRow(values);
// //   });
  
// //   // Auto-fit columns
// //   worksheet.columns.forEach((column, index) => {
// //     let maxLength = 0;
// //     column.eachCell({ includeEmpty: true }, (cell) => {
// //       const columnLength = cell.value ? cell.value.toString().length : 10;
// //       if (columnLength > maxLength) {
// //         maxLength = columnLength;
// //       }
// //     });
// //     column.width = Math.min(maxLength + 2, 50);
// //   });
  
// //   // Add borders to all cells
// //   worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
// //     row.eachCell({ includeEmpty: false }, (cell) => {
// //       cell.border = {
// //         top: { style: 'thin' },
// //         left: { style: 'thin' },
// //         bottom: { style: 'thin' },
// //         right: { style: 'thin' }
// //       };
// //     });
// //   });
  
// //   // Add metadata sheet
// //   const metaSheet = workbook.addWorksheet('Query Info');
// //   metaSheet.addRow(['Query', query]);
// //   metaSheet.addRow(['Generated', new Date().toLocaleString()]);
// //   metaSheet.addRow(['Total Rows', rows.length]);
// //   metaSheet.getColumn(1).width = 15;
// //   metaSheet.getColumn(2).width = 50;
  
// //   return workbook;
// // }

// // // ============= Routes =============

// // app.get('/', (req, res) => {
// //   res.json({ 
// //     message: 'Backend API is running',
// //     endpoints: {
// //       health: '/health',
// //       nlToSql: '/api/nl-query',
// //       schema: '/api/schema',
// //       exportExcel: '/api/export-excel'
// //     }
// //   });
// // });

// // app.get('/health', (req, res) => {
// //   res.json({ status: 'healthy', timestamp: new Date().toISOString() });
// // });

// // app.get('/api/schema', async (req, res) => {
// //   try {
// //     const schema = await getDatabaseSchema();
// //     res.json({ success: true, schema });
// //   } catch (error) {
// //     console.error('Error fetching schema:', error);
// //     res.status(500).json({ 
// //       success: false, 
// //       error: 'Failed to fetch database schema' 
// //     });
// //   }
// // });

// // app.post('/api/nl-query', async (req, res) => {
// //   try {
// //     const { query } = req.body;
    
// //     if (!query) {
// //       return res.status(400).json({
// //         success: false,
// //         error: 'Query is required'
// //       });
// //     }
    
// //     console.log('📝 Received query:', query);
    
// //     const schema = await getDatabaseSchema();
// //     console.log('📊 Schema fetched');
    
// //     const sqlQuery = await generateSQL(query, schema);
// //     console.log('🔧 Generated SQL:', sqlQuery);
    
// //     const results = await executeSQL(sqlQuery);
// //     console.log('✅ Query executed, rows:', results.length);
    
// //     const answer = formatResults(results, sqlQuery);
    
// //     // Determine if results are exportable (tabular data)
// //     const hasExportableData = results.length > 0 && typeof results[0] === 'object';
    
// //     res.json({
// //       success: true,
// //       answer,
// //       sql: sqlQuery,
// //       results: results.slice(0, 100),
// //       rowCount: results.length,
// //       hasExport: hasExportableData,
// //       query: query // Send back original query for export
// //     });
    
// //   } catch (error) {
// //     console.error('❌ Error processing query:', error);
// //     res.status(500).json({
// //       success: false,
// //       error: error.message
// //     });
// //   }
// // });

// // // Excel export endpoint
// // app.post('/api/export-excel', async (req, res) => {
// //   try {
// //     const { sql, query } = req.body;
    
// //     if (!sql) {
// //       return res.status(400).json({
// //         success: false,
// //         error: 'SQL query is required'
// //       });
// //     }
    
// //     console.log('📊 Exporting to Excel:', sql);
    
// //     // Execute the SQL query
// //     const results = await executeSQL(sql);
    
// //     if (results.length === 0) {
// //       return res.status(400).json({
// //         success: false,
// //         error: 'No data to export'
// //       });
// //     }
    
// //     // Generate Excel file
// //     const workbook = await generateExcel(results, query || 'Query Results');
    
// //     // Set response headers for file download
// //     res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
// //     res.setHeader('Content-Disposition', `attachment; filename=query_results_${Date.now()}.xlsx`);
    
// //     // Write to response
// //     await workbook.xlsx.write(res);
// //     res.end();
    
// //     console.log('✅ Excel file generated successfully');
    
// //   } catch (error) {
// //     console.error('❌ Error exporting to Excel:', error);
// //     res.status(500).json({
// //       success: false,
// //       error: error.message
// //     });
// //   }
// // });

// // // Graceful shutdown
// // process.on('SIGTERM', () => {
// //   console.log('SIGTERM signal received: closing HTTP server');
// //   pool.end(() => {
// //     console.log('Database pool closed');
// //   });
// // });

// // const PORT = process.env.PORT || 5000;
// // app.listen(PORT, () => {
// //   console.log(`🚀 Server running on port ${PORT}`);
// //   console.log(`📍 http://localhost:${PORT}`);
// // });

// // module.exports = app;

// // const express = require('express');
// // const cors = require('cors');
// // const { GoogleGenerativeAI } = require('@google/generative-ai');
// // const { Pool } = require('pg');
// // const ExcelJS = require('exceljs');
// // require('dotenv').config();

// // const app = express();

// // // Middleware
// // app.use(cors());
// // app.use(express.json());

// // // Initialize Gemini AI
// // const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
// // const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

// // // Initialize PostgreSQL connection
// // const pool = new Pool({
// //   connectionString: process.env.DATABASE_URL,
// //   ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
// //   max: 20,
// //   idleTimeoutMillis: 30000,
// //   connectionTimeoutMillis: 10000,
// //   keepAlive: true,
// //   keepAliveInitialDelayMs: 10000
// // });

// // pool.on('error', (err, client) => {
// //   console.error('❌ Unexpected error on idle client', err);
// // });

// // pool.connect()
// //   .then(client => {
// //     console.log('✅ Database connected successfully');
// //     client.release();
// //   })
// //   .catch(err => {
// //     console.error('❌ Database connection error:', err.message);
// //   });

// // // ============= NL-to-SQL Functions =============

// // async function getDatabaseSchema() {
// //   const client = await pool.connect();
// //   try {
// //     const query = `
// //       SELECT 
// //         table_name,
// //         column_name,
// //         data_type,
// //         is_nullable
// //       FROM information_schema.columns
// //       WHERE table_schema = 'public'
// //       ORDER BY table_name, ordinal_position;
// //     `;
    
// //     const result = await client.query(query);
    
// //     const schemaByTable = {};
// //     result.rows.forEach(row => {
// //       if (!schemaByTable[row.table_name]) {
// //         schemaByTable[row.table_name] = [];
// //       }
// //       schemaByTable[row.table_name].push({
// //         column: row.column_name,
// //         type: row.data_type,
// //         nullable: row.is_nullable === 'YES'
// //       });
// //     });
    
// //     return schemaByTable;
// //   } catch (error) {
// //     console.error('Error fetching schema:', error);
// //     throw error;
// //   } finally {
// //     client.release();
// //   }
// // }

// // async function generateSQL(naturalLanguageQuery, schema) {
// //   const schemaText = Object.entries(schema)
// //     .map(([table, columns]) => {
// //       const columnDefs = columns
// //         .map(col => `  - ${col.column} (${col.type})`)
// //         .join('\n');
// //       return `Table: ${table}\n${columnDefs}`;
// //     })
// //     .join('\n\n');

// //   const prompt = `You are a SQL expert. Convert the following natural language query into a SQL query.

// // Database Schema:
// // ${schemaText}

// // Natural Language Query: ${naturalLanguageQuery}

// // Rules:
// // 1. Generate ONLY the SQL query, no explanations
// // 2. Use proper PostgreSQL syntax
// // 3. Use table and column names exactly as shown in the schema
// // 4. For SELECT queries, limit results to 100 rows unless specified
// // 5. Be careful with JOIN conditions
// // 6. IMPORTANT: Use ILIKE (case-insensitive) instead of LIKE for text comparisons, and use LOWER() function for exact text matches to make searches case-insensitive
// // 7. For text comparisons, always use: LOWER(column_name) = LOWER('value') OR column_name ILIKE 'value'
// // 8. Return ONLY the SQL query without any markdown formatting or additional text

// // SQL Query:`;

// //   try {
// //     const result = await model.generateContent(prompt);
// //     const response = await result.response;
// //     let sqlQuery = response.text().trim();
    
// //     sqlQuery = sqlQuery.replace(/```sql\n?/g, '').replace(/```\n?/g, '').trim();
    
// //     return sqlQuery;
// //   } catch (error) {
// //     console.error('Error generating SQL:', error);
// //     throw error;
// //   }
// // }

// // async function executeSQL(sqlQuery) {
// //   const trimmedQuery = sqlQuery.trim().toUpperCase();
// //   if (!trimmedQuery.startsWith('SELECT')) {
// //     throw new Error('Only SELECT queries are allowed for safety reasons');
// //   }
  
// //   const client = await pool.connect();
// //   try {
// //     const result = await client.query(sqlQuery);
// //     return result.rows;
// //   } catch (error) {
// //     console.error('Error executing SQL:', error);
// //     throw error;
// //   } finally {
// //     client.release();
// //   }
// // }

// // // ============= AI-Powered Chart Detection =============

// // async function analyzeForVisualization(query, results, sqlQuery) {
// //   if (!results || results.length === 0) {
// //     return { shouldVisualize: false };
// //   }

// //   // Get column information
// //   const columns = Object.keys(results[0]);
// //   const sampleData = results.slice(0, 5);
  
// //   const columnTypes = columns.map(col => {
// //     const sampleValue = results[0][col];
// //     return {
// //       name: col,
// //       type: typeof sampleValue === 'number' ? 'numeric' : 
// //             sampleValue instanceof Date ? 'date' : 'text',
// //       sampleValues: sampleData.map(row => row[col]).slice(0, 3)
// //     };
// //   });

// //   const prompt = `You are a data visualization expert. Analyze this query and data to determine if a chart would be helpful.

// // User Query: "${query}"

// // SQL Query: ${sqlQuery}

// // Data Structure:
// // - Row Count: ${results.length}
// // - Columns: ${JSON.stringify(columnTypes, null, 2)}

// // Sample Data (first 3 rows):
// // ${JSON.stringify(sampleData, null, 2)}

// // Analyze and respond in this EXACT JSON format (no additional text):
// // {
// //   "shouldVisualize": true/false,
// //   "chartType": "bar" | "line" | "pie" | null,
// //   "reasoning": "brief explanation",
// //   "xAxis": "column name for x-axis or labels",
// //   "yAxis": "column name for y-axis or values"
// // }

// // Guidelines:
// // - Use BAR charts for: comparisons, rankings, top N queries, counts by category
// // - Use LINE charts for: time series, trends over time, sequential data
// // - Use PIE charts for: proportions, distributions, percentages, market share
// // - Set shouldVisualize to true if:
// //   * Data shows comparisons between entities
// //   * There are rankings or top N results
// //   * Data represents distributions or proportions
// //   * There are trends or patterns over time
// //   * Numeric values across categories
// // - Set shouldVisualize to false if:
// //   * Single value result
// //   * Detailed record listings
// //   * Text-heavy results
// //   * Less than 2 rows
// //   * Query asks for specific details not suitable for charts

// // Respond ONLY with valid JSON, no other text.`;

// //   try {
// //     const result = await model.generateContent(prompt);
// //     const response = await result.response;
// //     let analysisText = response.text().trim();
    
// //     // Clean up the response
// //     analysisText = analysisText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
// //     const analysis = JSON.parse(analysisText);
// //     console.log('📊 Visualization Analysis:', analysis);
    
// //     return analysis;
// //   } catch (error) {
// //     console.error('Error analyzing for visualization:', error);
// //     return { shouldVisualize: false };
// //   }
// // }

// // // ============= Enhanced Answer Generation =============

// // async function generateIntelligentAnswer(rows, sqlQuery, originalQuery, visualizationPlan) {
// //   if (rows.length === 0) {
// //     return 'No results found for your query.';
// //   }

// //   const dataString = JSON.stringify(rows.slice(0, 20), null, 2);
  
// //   const vizContext = visualizationPlan.shouldVisualize 
// //     ? `\n\nNote: A ${visualizationPlan.chartType} chart will be displayed to visualize this data.`
// //     : '';

// //   const prompt = `You are an intelligent data analyst assistant. Analyze the query results and provide a natural, conversational answer.

// // User's Question: "${originalQuery}"

// // Query Results (${rows.length} total rows):
// // ${dataString}

// // ${vizContext}

// // Instructions:
// // 1. Provide a natural, conversational answer as if you're talking to a colleague
// // 2. Start with a direct answer to their question
// // 3. Include key insights and interesting findings
// // 4. Use emojis thoughtfully to make it engaging (📊 for stats, 🏆 for leaders, 📈 for growth, etc.)
// // 5. Format numbers with commas for readability
// // 6. If there's a chart, mention it naturally in your response
// // 7. Keep it concise but informative - aim for 3-5 sentences unless the data requires more explanation
// // 8. Don't mention SQL, databases, or technical details
// // 9. Sound like an AI assistant, not a formal report

// // Your response:`;

// //   try {
// //     const result = await model.generateContent(prompt);
// //     const response = await result.response;
// //     return response.text().trim();
// //   } catch (error) {
// //     console.error('Error generating answer:', error);
// //     return formatResults(rows, sqlQuery);
// //   }
// // }

// // function formatResults(rows, sqlQuery) {
// //   if (rows.length === 0) {
// //     return 'No results found.';
// //   }
  
// //   const rowCount = rows.length;
// //   const columns = Object.keys(rows[0]);
  
// //   const formatColumnName = (col) => {
// //     return col.split('_')
// //       .map(word => word.charAt(0).toUpperCase() + word.slice(1))
// //       .join(' ');
// //   };
  
// //   const formatValue = (value, key) => {
// //     if (value === null || value === undefined) return 'N/A';
    
// //     if (value instanceof Date) {
// //       return value.toLocaleDateString('en-US', { 
// //         year: 'numeric', 
// //         month: 'short', 
// //         day: 'numeric' 
// //       });
// //     }
    
// //     if (typeof value === 'number' && (key.includes('view') || key.includes('like') || key.includes('comment') || key.includes('follower') || key.includes('sum') || key.includes('total') || key.includes('count'))) {
// //       return value.toLocaleString();
// //     }
    
// //     return value;
// //   };
  
// //   let response = '';
  
// //   const displayLimit = Math.min(10, rowCount);
// //   rows.slice(0, displayLimit).forEach((row, idx) => {
// //     response += `Result ${idx + 1}:\n`;
// //     columns.forEach(col => {
// //       const formattedName = formatColumnName(col);
// //       const formattedValue = formatValue(row[col], col);
// //       response += `  ${formattedName}: ${formattedValue}\n`;
// //     });
// //     response += '\n';
// //   });
  
// //   if (rowCount > displayLimit) {
// //     response += `... and ${rowCount - displayLimit} more result${rowCount - displayLimit > 1 ? 's' : ''}`;
// //   }
  
// //   return response;
// // }

// // // ============= Excel Export Function =============

// // async function generateExcel(rows, query) {
// //   const workbook = new ExcelJS.Workbook();
// //   const worksheet = workbook.addWorksheet('Query Results');
  
// //   if (rows.length === 0) {
// //     worksheet.addRow(['No results found']);
// //     return workbook;
// //   }
  
// //   const columns = Object.keys(rows[0]);
  
// //   const formatColumnName = (col) => {
// //     return col.split('_')
// //       .map(word => word.charAt(0).toUpperCase() + word.slice(1))
// //       .join(' ');
// //   };
  
// //   const headerRow = worksheet.addRow(columns.map(formatColumnName));
// //   headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
// //   headerRow.fill = {
// //     type: 'pattern',
// //     pattern: 'solid',
// //     fgColor: { argb: 'FF4472C4' }
// //   };
// //   headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  
// //   rows.forEach(row => {
// //     const values = columns.map(col => {
// //       const value = row[col];
// //       if (value === null || value === undefined) return 'N/A';
// //       if (value instanceof Date) return value;
// //       return value;
// //     });
// //     worksheet.addRow(values);
// //   });
  
// //   worksheet.columns.forEach((column, index) => {
// //     let maxLength = 0;
// //     column.eachCell({ includeEmpty: true }, (cell) => {
// //       const columnLength = cell.value ? cell.value.toString().length : 10;
// //       if (columnLength > maxLength) {
// //         maxLength = columnLength;
// //       }
// //     });
// //     column.width = Math.min(maxLength + 2, 50);
// //   });
  
// //   worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
// //     row.eachCell({ includeEmpty: false }, (cell) => {
// //       cell.border = {
// //         top: { style: 'thin' },
// //         left: { style: 'thin' },
// //         bottom: { style: 'thin' },
// //         right: { style: 'thin' }
// //       };
// //     });
// //   });
  
// //   const metaSheet = workbook.addWorksheet('Query Info');
// //   metaSheet.addRow(['Query', query]);
// //   metaSheet.addRow(['Generated', new Date().toLocaleString()]);
// //   metaSheet.addRow(['Total Rows', rows.length]);
// //   metaSheet.getColumn(1).width = 15;
// //   metaSheet.getColumn(2).width = 50;
  
// //   return workbook;
// // }

// // // ============= Routes =============

// // app.get('/', (req, res) => {
// //   res.json({ 
// //     message: 'AI-Powered Backend API is running',
// //     endpoints: {
// //       health: '/health',
// //       nlToSql: '/api/nl-query',
// //       schema: '/api/schema',
// //       exportExcel: '/api/export-excel'
// //     }
// //   });
// // });

// // app.get('/health', (req, res) => {
// //   res.json({ status: 'healthy', timestamp: new Date().toISOString() });
// // });

// // app.get('/api/schema', async (req, res) => {
// //   try {
// //     const schema = await getDatabaseSchema();
// //     res.json({ success: true, schema });
// //   } catch (error) {
// //     console.error('Error fetching schema:', error);
// //     res.status(500).json({ 
// //       success: false, 
// //       error: 'Failed to fetch database schema' 
// //     });
// //   }
// // });

// // app.post('/api/nl-query', async (req, res) => {
// //   try {
// //     const { query } = req.body;
    
// //     if (!query) {
// //       return res.status(400).json({
// //         success: false,
// //         error: 'Query is required'
// //       });
// //     }
    
// //     console.log('📝 Received query:', query);
    
// //     // Step 1: Get schema
// //     const schema = await getDatabaseSchema();
// //     console.log('📊 Schema fetched');
    
// //     // Step 2: Generate SQL
// //     const sqlQuery = await generateSQL(query, schema);
// //     console.log('🔧 Generated SQL:', sqlQuery);
    
// //     // Step 3: Execute query
// //     const results = await executeSQL(sqlQuery);
// //     console.log('✅ Query executed, rows:', results.length);
    
// //     // Step 4: AI analyzes if visualization is needed
// //     const visualizationPlan = await analyzeForVisualization(query, results, sqlQuery);
// //     console.log('🎨 Visualization plan:', visualizationPlan);
    
// //     // Step 5: Generate intelligent answer
// //     const answer = await generateIntelligentAnswer(results, sqlQuery, query, visualizationPlan);
    
// //     // Determine if results are exportable
// //     const hasExportableData = results.length > 0 && typeof results[0] === 'object';
    
// //     res.json({
// //       success: true,
// //       answer,
// //       sql: sqlQuery,
// //       results: results.slice(0, 100),
// //       rowCount: results.length,
// //       hasExport: hasExportableData,
// //       query: query,
// //       visualization: visualizationPlan.shouldVisualize ? {
// //         enabled: true,
// //         chartType: visualizationPlan.chartType,
// //         xAxis: visualizationPlan.xAxis,
// //         yAxis: visualizationPlan.yAxis,
// //         reasoning: visualizationPlan.reasoning
// //       } : { enabled: false }
// //     });
    
// //   } catch (error) {
// //     console.error('❌ Error processing query:', error);
// //     res.status(500).json({
// //       success: false,
// //       error: error.message
// //     });
// //   }
// // });

// // app.post('/api/export-excel', async (req, res) => {
// //   try {
// //     const { sql, query } = req.body;
    
// //     if (!sql) {
// //       return res.status(400).json({
// //         success: false,
// //         error: 'SQL query is required'
// //       });
// //     }
    
// //     console.log('📊 Exporting to Excel:', sql);
    
// //     const results = await executeSQL(sql);
    
// //     if (results.length === 0) {
// //       return res.status(400).json({
// //         success: false,
// //         error: 'No data to export'
// //       });
// //     }
    
// //     const workbook = await generateExcel(results, query || 'Query Results');
    
// //     res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
// //     res.setHeader('Content-Disposition', `attachment; filename=query_results_${Date.now()}.xlsx`);
    
// //     await workbook.xlsx.write(res);
// //     res.end();
    
// //     console.log('✅ Excel file generated successfully');
    
// //   } catch (error) {
// //     console.error('❌ Error exporting to Excel:', error);
// //     res.status(500).json({
// //       success: false,
// //       error: error.message
// //     });
// //   }
// // });

// // // Graceful shutdown
// // process.on('SIGTERM', () => {
// //   console.log('SIGTERM signal received: closing HTTP server');
// //   pool.end(() => {
// //     console.log('Database pool closed');
// //   });
// // });

// // const PORT = process.env.PORT || 5000;
// // app.listen(PORT, () => {
// //   console.log(`🚀 AI-Powered Server running on port ${PORT}`);
// //   console.log(`📍 http://localhost:${PORT}`);
// // });

// // module.exports = app;


// // const express = require('express');
// // const cors = require('cors');
// // const { GoogleGenerativeAI } = require('@google/generative-ai');
// // const { Pool } = require('pg');
// // const ExcelJS = require('exceljs');
// // require('dotenv').config();

// // const app = express();

// // // Middleware
// // app.use(cors());
// // app.use(express.json());

// // // Initialize Gemini AI
// // const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
// // const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

// // // Initialize PostgreSQL connection
// // const pool = new Pool({
// //   connectionString: process.env.DATABASE_URL,
// //   ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
// //   max: 20,
// //   idleTimeoutMillis: 30000,
// //   connectionTimeoutMillis: 10000,
// //   keepAlive: true,
// //   keepAliveInitialDelayMs: 10000
// // });

// // pool.on('error', (err, client) => {
// //   console.error('❌ Unexpected error on idle client', err);
// // });

// // pool.connect()
// //   .then(client => {
// //     console.log('✅ Database connected successfully');
// //     client.release();
// //   })
// //   .catch(err => {
// //     console.error('❌ Database connection error:', err.message);
// //   });

// // // ============= NL-to-SQL Functions =============

// // async function getDatabaseSchema() {
// //   const client = await pool.connect();
// //   try {
// //     const query = `
// //       SELECT 
// //         table_name,
// //         column_name,
// //         data_type,
// //         is_nullable
// //       FROM information_schema.columns
// //       WHERE table_schema = 'public'
// //       ORDER BY table_name, ordinal_position;
// //     `;
    
// //     const result = await client.query(query);
    
// //     const schemaByTable = {};
// //     result.rows.forEach(row => {
// //       if (!schemaByTable[row.table_name]) {
// //         schemaByTable[row.table_name] = [];
// //       }
// //       schemaByTable[row.table_name].push({
// //         column: row.column_name,
// //         type: row.data_type,
// //         nullable: row.is_nullable === 'YES'
// //       });
// //     });
    
// //     return schemaByTable;
// //   } catch (error) {
// //     console.error('Error fetching schema:', error);
// //     throw error;
// //   } finally {
// //     client.release();
// //   }
// // }

// // async function generateSQL(naturalLanguageQuery, schema) {
// //   const schemaText = Object.entries(schema)
// //     .map(([table, columns]) => {
// //       const columnDefs = columns
// //         .map(col => `  - ${col.column} (${col.type})`)
// //         .join('\n');
// //       return `Table: ${table}\n${columnDefs}`;
// //     })
// //     .join('\n\n');

// //   const prompt = `You are a SQL expert. Convert the following natural language query into a SQL query.

// // Database Schema:
// // ${schemaText}

// // Natural Language Query: ${naturalLanguageQuery}

// // Rules:
// // 1. Generate ONLY the SQL query, no explanations or comments
// // 2. Use proper PostgreSQL syntax
// // 3. Use table and column names exactly as shown in the schema
// // 4. For SELECT queries, limit results to 100 rows unless specified
// // 5. Be careful with JOIN conditions
// // 6. IMPORTANT: Use ILIKE (case-insensitive) instead of LIKE for text comparisons, and use LOWER() function for exact text matches to make searches case-insensitive
// // 7. For text comparisons, always use: LOWER(column_name) = LOWER('value') OR column_name ILIKE 'value'
// // 8. Return ONLY the SQL query without any markdown formatting, comments (--), or additional text
// // 9. Start directly with SELECT, no comments before it

// // SQL Query:`;

// //   try {
// //     const result = await model.generateContent(prompt);
// //     const response = await result.response;
// //     let sqlQuery = response.text().trim();
    
// //     sqlQuery = sqlQuery.replace(/```sql\n?/g, '').replace(/```\n?/g, '').trim();
    
// //     return sqlQuery;
// //   } catch (error) {
// //     console.error('Error generating SQL:', error);
// //     throw error;
// //   }
// // }

// // async function executeSQL(sqlQuery) {
// //   // Remove comments and get the actual SQL query
// //   const cleanedQuery = sqlQuery
// //     .split('\n')
// //     .filter(line => !line.trim().startsWith('--'))
// //     .join('\n')
// //     .trim();
  
// //   const upperQuery = cleanedQuery.toUpperCase();
// //   if (!upperQuery.startsWith('SELECT')) {
// //     throw new Error('Only SELECT queries are allowed for safety reasons');
// //   }
  
// //   const client = await pool.connect();
// //   try {
// //     const result = await client.query(cleanedQuery);
// //     return result.rows;
// //   } catch (error) {
// //     console.error('Error executing SQL:', error);
// //     throw error;
// //   } finally {
// //     client.release();
// //   }
// // }

// // // ============= AI-Powered Chart Detection =============

// // async function analyzeForVisualization(query, results, sqlQuery) {
// //   if (!results || results.length === 0) {
// //     return { shouldVisualize: false };
// //   }

// //   // Get column information
// //   const columns = Object.keys(results[0]);
// //   const sampleData = results.slice(0, 5);
  
// //   const columnTypes = columns.map(col => {
// //     const sampleValue = results[0][col];
// //     return {
// //       name: col,
// //       type: typeof sampleValue === 'number' ? 'numeric' : 
// //             sampleValue instanceof Date ? 'date' : 'text',
// //       sampleValues: sampleData.map(row => row[col]).slice(0, 3)
// //     };
// //   });

// //   const prompt = `You are a data visualization expert. Analyze this query and data to determine if a chart would be helpful.

// // User Query: "${query}"

// // SQL Query: ${sqlQuery}

// // Data Structure:
// // - Row Count: ${results.length}
// // - Columns: ${JSON.stringify(columnTypes, null, 2)}

// // Sample Data (first 3 rows):
// // ${JSON.stringify(sampleData, null, 2)}

// // Analyze and respond in this EXACT JSON format (no additional text):
// // {
// //   "shouldVisualize": true/false,
// //   "chartType": "bar" | "line" | "pie" | null,
// //   "reasoning": "brief explanation",
// //   "xAxis": "column name for x-axis or labels",
// //   "yAxis": "column name for y-axis or values"
// // }

// // Guidelines:
// // - Use BAR charts for: comparisons, rankings, top N queries, counts by category
// // - Use LINE charts for: time series, trends over time, sequential data
// // - Use PIE charts for: proportions, distributions, percentages, market share
// // - Set shouldVisualize to true if:
// //   * Data shows comparisons between entities
// //   * There are rankings or top N results
// //   * Data represents distributions or proportions
// //   * There are trends or patterns over time
// //   * Numeric values across categories
// // - Set shouldVisualize to false if:
// //   * Single value result
// //   * Detailed record listings
// //   * Text-heavy results
// //   * Less than 2 rows
// //   * Query asks for specific details not suitable for charts

// // Respond ONLY with valid JSON, no other text.`;

// //   try {
// //     const result = await model.generateContent(prompt);
// //     const response = await result.response;
// //     let analysisText = response.text().trim();
    
// //     // Clean up the response
// //     analysisText = analysisText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
// //     const analysis = JSON.parse(analysisText);
// //     console.log('📊 Visualization Analysis:', analysis);
    
// //     return analysis;
// //   } catch (error) {
// //     console.error('Error analyzing for visualization:', error);
// //     return { shouldVisualize: false };
// //   }
// // }

// // // ============= Enhanced Answer Generation =============

// // async function generateIntelligentAnswer(rows, sqlQuery, originalQuery, visualizationPlan) {
// //   if (rows.length === 0) {
// //     return 'No results found for your query.';
// //   }

// //   const dataString = JSON.stringify(rows.slice(0, 20), null, 2);
  
// //   const vizContext = visualizationPlan.shouldVisualize 
// //     ? `\n\nNote: A ${visualizationPlan.chartType} chart will be displayed to visualize this data.`
// //     : '';

// //   const prompt = `You are an intelligent data analyst assistant. Analyze the query results and provide a natural, conversational answer.

// // User's Question: "${originalQuery}"

// // Query Results (${rows.length} total rows):
// // ${dataString}

// // ${vizContext}

// // Instructions:
// // 1. Provide a natural, conversational answer as if you're talking to a colleague
// // 2. Start with a direct answer to their question
// // 3. Include key insights and interesting findings
// // 4. Use emojis thoughtfully to make it engaging (📊 for stats, 🏆 for leaders, 📈 for growth, etc.)
// // 5. Format numbers with commas for readability
// // 6. If there's a chart, mention it naturally in your response
// // 7. Keep it concise but informative - aim for 3-5 sentences unless the data requires more explanation
// // 8. Don't mention SQL, databases, or technical details
// // 9. Sound like an AI assistant, not a formal report

// // Your response:`;

// //   try {
// //     const result = await model.generateContent(prompt);
// //     const response = await result.response;
// //     return response.text().trim();
// //   } catch (error) {
// //     console.error('Error generating answer:', error);
// //     return formatResults(rows, sqlQuery);
// //   }
// // }

// // function formatResults(rows, sqlQuery) {
// //   if (rows.length === 0) {
// //     return 'No results found.';
// //   }
  
// //   const rowCount = rows.length;
// //   const columns = Object.keys(rows[0]);
  
// //   const formatColumnName = (col) => {
// //     return col.split('_')
// //       .map(word => word.charAt(0).toUpperCase() + word.slice(1))
// //       .join(' ');
// //   };
  
// //   const formatValue = (value, key) => {
// //     if (value === null || value === undefined) return 'N/A';
    
// //     if (value instanceof Date) {
// //       return value.toLocaleDateString('en-US', { 
// //         year: 'numeric', 
// //         month: 'short', 
// //         day: 'numeric' 
// //       });
// //     }
    
// //     if (typeof value === 'number' && (key.includes('view') || key.includes('like') || key.includes('comment') || key.includes('follower') || key.includes('sum') || key.includes('total') || key.includes('count'))) {
// //       return value.toLocaleString();
// //     }
    
// //     return value;
// //   };
  
// //   let response = '';
  
// //   const displayLimit = Math.min(10, rowCount);
// //   rows.slice(0, displayLimit).forEach((row, idx) => {
// //     response += `Result ${idx + 1}:\n`;
// //     columns.forEach(col => {
// //       const formattedName = formatColumnName(col);
// //       const formattedValue = formatValue(row[col], col);
// //       response += `  ${formattedName}: ${formattedValue}\n`;
// //     });
// //     response += '\n';
// //   });
  
// //   if (rowCount > displayLimit) {
// //     response += `... and ${rowCount - displayLimit} more result${rowCount - displayLimit > 1 ? 's' : ''}`;
// //   }
  
// //   return response;
// // }

// // // ============= Excel Export Function =============

// // async function generateExcel(rows, query) {
// //   const workbook = new ExcelJS.Workbook();
// //   const worksheet = workbook.addWorksheet('Query Results');
  
// //   if (rows.length === 0) {
// //     worksheet.addRow(['No results found']);
// //     return workbook;
// //   }
  
// //   const columns = Object.keys(rows[0]);
  
// //   const formatColumnName = (col) => {
// //     return col.split('_')
// //       .map(word => word.charAt(0).toUpperCase() + word.slice(1))
// //       .join(' ');
// //   };
  
// //   const headerRow = worksheet.addRow(columns.map(formatColumnName));
// //   headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
// //   headerRow.fill = {
// //     type: 'pattern',
// //     pattern: 'solid',
// //     fgColor: { argb: 'FF4472C4' }
// //   };
// //   headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  
// //   rows.forEach(row => {
// //     const values = columns.map(col => {
// //       const value = row[col];
// //       if (value === null || value === undefined) return 'N/A';
// //       if (value instanceof Date) return value;
// //       return value;
// //     });
// //     worksheet.addRow(values);
// //   });
  
// //   worksheet.columns.forEach((column, index) => {
// //     let maxLength = 0;
// //     column.eachCell({ includeEmpty: true }, (cell) => {
// //       const columnLength = cell.value ? cell.value.toString().length : 10;
// //       if (columnLength > maxLength) {
// //         maxLength = columnLength;
// //       }
// //     });
// //     column.width = Math.min(maxLength + 2, 50);
// //   });
  
// //   worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
// //     row.eachCell({ includeEmpty: false }, (cell) => {
// //       cell.border = {
// //         top: { style: 'thin' },
// //         left: { style: 'thin' },
// //         bottom: { style: 'thin' },
// //         right: { style: 'thin' }
// //       };
// //     });
// //   });
  
// //   const metaSheet = workbook.addWorksheet('Query Info');
// //   metaSheet.addRow(['Query', query]);
// //   metaSheet.addRow(['Generated', new Date().toLocaleString()]);
// //   metaSheet.addRow(['Total Rows', rows.length]);
// //   metaSheet.getColumn(1).width = 15;
// //   metaSheet.getColumn(2).width = 50;
  
// //   return workbook;
// // }

// // // ============= Routes =============

// // app.get('/', (req, res) => {
// //   res.json({ 
// //     message: 'AI-Powered Backend API is running',
// //     endpoints: {
// //       health: '/health',
// //       nlToSql: '/api/nl-query',
// //       schema: '/api/schema',
// //       exportExcel: '/api/export-excel'
// //     }
// //   });
// // });

// // app.get('/health', (req, res) => {
// //   res.json({ status: 'healthy', timestamp: new Date().toISOString() });
// // });

// // app.get('/api/schema', async (req, res) => {
// //   try {
// //     const schema = await getDatabaseSchema();
// //     res.json({ success: true, schema });
// //   } catch (error) {
// //     console.error('Error fetching schema:', error);
// //     res.status(500).json({ 
// //       success: false, 
// //       error: 'Failed to fetch database schema' 
// //     });
// //   }
// // });

// // app.post('/api/nl-query', async (req, res) => {
// //   try {
// //     const { query } = req.body;
    
// //     if (!query) {
// //       return res.status(400).json({
// //         success: false,
// //         error: 'Query is required'
// //       });
// //     }
    
// //     console.log('📝 Received query:', query);
    
// //     // Step 1: Get schema
// //     const schema = await getDatabaseSchema();
// //     console.log('📊 Schema fetched');
    
// //     // Step 2: Generate SQL
// //     const sqlQuery = await generateSQL(query, schema);
// //     console.log('🔧 Generated SQL:', sqlQuery);
    
// //     // Step 3: Execute query
// //     const results = await executeSQL(sqlQuery);
// //     console.log('✅ Query executed, rows:', results.length);
    
// //     // Step 4: AI analyzes if visualization is needed
// //     const visualizationPlan = await analyzeForVisualization(query, results, sqlQuery);
// //     console.log('🎨 Visualization plan:', visualizationPlan);
    
// //     // Step 5: Generate intelligent answer
// //     const answer = await generateIntelligentAnswer(results, sqlQuery, query, visualizationPlan);
    
// //     // Determine if results are exportable
// //     const hasExportableData = results.length > 0 && typeof results[0] === 'object';
    
// //     res.json({
// //       success: true,
// //       answer,
// //       sql: sqlQuery,
// //       results: results.slice(0, 100),
// //       rowCount: results.length,
// //       hasExport: hasExportableData,
// //       query: query,
// //       visualization: visualizationPlan.shouldVisualize ? {
// //         enabled: true,
// //         chartType: visualizationPlan.chartType,
// //         xAxis: visualizationPlan.xAxis,
// //         yAxis: visualizationPlan.yAxis,
// //         reasoning: visualizationPlan.reasoning
// //       } : { enabled: false }
// //     });
    
// //   } catch (error) {
// //     console.error('❌ Error processing query:', error);
// //     res.status(500).json({
// //       success: false,
// //       error: error.message
// //     });
// //   }
// // });

// // app.post('/api/export-excel', async (req, res) => {
// //   try {
// //     const { sql, query } = req.body;
    
// //     if (!sql) {
// //       return res.status(400).json({
// //         success: false,
// //         error: 'SQL query is required'
// //       });
// //     }
    
// //     console.log('📊 Exporting to Excel:', sql);
    
// //     const results = await executeSQL(sql);
    
// //     if (results.length === 0) {
// //       return res.status(400).json({
// //         success: false,
// //         error: 'No data to export'
// //       });
// //     }
    
// //     const workbook = await generateExcel(results, query || 'Query Results');
    
// //     res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
// //     res.setHeader('Content-Disposition', `attachment; filename=query_results_${Date.now()}.xlsx`);
    
// //     await workbook.xlsx.write(res);
// //     res.end();
    
// //     console.log('✅ Excel file generated successfully');
    
// //   } catch (error) {
// //     console.error('❌ Error exporting to Excel:', error);
// //     res.status(500).json({
// //       success: false,
// //       error: error.message
// //     });
// //   }
// // });

// // // Graceful shutdown
// // process.on('SIGTERM', () => {
// //   console.log('SIGTERM signal received: closing HTTP server');
// //   pool.end(() => {
// //     console.log('Database pool closed');
// //   });
// // });

// // const PORT = process.env.PORT || 5000;
// // app.listen(PORT, () => {
// //   console.log(`🚀 AI-Powered Server running on port ${PORT}`);
// //   console.log(`📍 http://localhost:${PORT}`);
// // });

// // module.exports = app;


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
// const genAI = new GoogleGenerativeAI("AIzaSyBEnIfY-I1kt2ICFOI4NBW0G3SEakTcDx8");
// const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

// // Initialize PostgreSQL connection
// const pool = new Pool({
//   connectionString: "postgresql://neondb_owner:npg_2B6QXDatPwlp@ep-sparkling-lab-a15aax1d-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
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

// // ============= FEATURE CONFIGURATION =============

// const FEATURE_SCHEMAS = {
//   INSTAGRAM_ANALYZER: {
//     tables: ['brands', 'products', 'store_inventory','zipcodes'],
//     description: 'Instagram Analytics Database',
//     contextInfo: `
//     `
//   },
//   MAIN_APP: {
//     tables: ['User', 'Topic', 'Chat', 'Notification', 'Organization', 'Whitelist', 'ScrapedData'],
//     description: 'Main Application Database',
//     contextInfo: 'Chat application with users, topics, and conversations'
//   }
// };

// // ============= Enhanced Schema Functions =============

// async function getDatabaseSchema(featureType = 'INSTAGRAM_ANALYZER') {
//   const client = await pool.connect();
//   try {
//     const allowedTables = FEATURE_SCHEMAS[featureType].tables;
    
//     // Convert table names to lowercase for case-insensitive comparison
//     const tableConditions = allowedTables.map(t => `'${t.toLowerCase()}'`).join(',');
    
//     const query = `
//       SELECT 
//         table_name,
//         column_name,
//         data_type,
//         is_nullable,
//         column_default
//       FROM information_schema.columns
//       WHERE table_schema = 'public'
//         AND LOWER(table_name) IN (${tableConditions})
//       ORDER BY table_name, ordinal_position;
//     `;
    
//     const result = await client.query(query);
    
//     if (result.rows.length === 0) {
//       console.warn(`⚠️ No tables found for feature: ${featureType}`);
//       console.warn(`Looking for tables: ${allowedTables.join(', ')}`);
//     }
    
//     const schemaByTable = {};
//     result.rows.forEach(row => {
//       if (!schemaByTable[row.table_name]) {
//         schemaByTable[row.table_name] = [];
//       }
//       schemaByTable[row.table_name].push({
//         column: row.column_name,
//         type: row.data_type,
//         nullable: row.is_nullable === 'YES',
//         default: row.column_default
//       });
//     });
    
//     console.log(`📊 Schema loaded for ${featureType}:`, Object.keys(schemaByTable));
//     return schemaByTable;
//   } catch (error) {
//     console.error('Error fetching schema:', error);
//     throw error;
//   } finally {
//     client.release();
//   }
// }

// async function generateSQL(naturalLanguageQuery, schema, featureType) {
//   const schemaText = Object.entries(schema)
//     .map(([table, columns]) => {
//       const columnDefs = columns
//         .map(col => `  - ${col.column} (${col.type})`)
//         .join('\n');
//       return `Table: ${table}\n${columnDefs}`;
//     })
//     .join('\n\n');

//   const featureContext = FEATURE_SCHEMAS[featureType].contextInfo;
// const prompt = `You are an expert SQL query generator  for Sephora's inventory management system. Convert the following natural language query into a precise PostgreSQL query.

// ${featureContext}

// Database Schema (ONLY use these exact tables and columns):
// ${schemaText}

// Natural Language Query: ${naturalLanguageQuery}

// CRITICAL RULES:
// 1. Generate ONLY the raw SQL query - no markdown, comments, explanations, or additional text
// 2. Start directly with SELECT, INSERT, UPDATE, or DELETE
// 3. Use ONLY the tables and columns shown in the schema above
// 4. Match table and column names EXACTLY as defined in the schema

// SEPHORA-SPECIFIC INTELLIGENCE:
// 5. Product Identification:
//    - "SKU" or "product ID" → use 'skuld' column from stores table
//    - "item ID" → use 'item_id' from scraper_a table
//    - Always treat SKU/product identifiers as case-insensitive (use UPPER() for consistency)

// 6. Stock Availability:
//    - "in stock", "available", "has stock" → WHERE in_stock = 'y'
//    - "out of stock", "not available", "unavailable" → WHERE in_stock = 'n'
//    - Always use single character: 'y' or 'n' (not 'yes'/'no' or boolean)

// 7. Location/Zipcode Queries:
//    - For zipcode searches: Use EXACT match (zipcode = '12345')
//    - "near", "around", "in area" → search specific zipcode or multiple zipcodes
//    - Join stores with zipcodes table when validating locations
//    - Always format zipcodes as strings with leading zeros preserved

// 8. Brand Queries:
//    - Brand names are case-insensitive: Use brand_name ILIKE '%brandname%'
//    - Link brands through: brands → scraper_a (via brand_id) → stores (via item_id/skuld relationship)
//    - Common brands: Fenty Beauty, Rare Beauty, Drunk Elephant, etc.

// 9. Store Queries:
//    - Store names: Use stores ILIKE '%storename%' for partial matches
//    - Include address when showing store locations
//    - Default sort: by store name or zipcode

// TEXT MATCHING RULES (Case-Insensitive Intelligence):
// 10. For ALL text searches, use ILIKE with wildcards:
//     - Product names: column_name ILIKE '%search_term%'
//     - Brand names: brand_name ILIKE '%search_term%'
//     - Store names: stores ILIKE '%store_name%'
//     - Addresses: address ILIKE '%location%'

// 11. For exact matches where case doesn't matter:
//     - UPPER(column_name) = UPPER('value')
//     - Especially for: SKU codes, zipcodes (if alphanumeric)

// 12. For partial word matching:
//     - Use: column_name ILIKE '%' || LOWER('search_term') || '%'

// QUERY OPTIMIZATION:
// 13. Always limit results to 100 rows unless user specifies otherwise
// 14. Use proper indexes: skuld, zipcode, brand_id, in_stock are indexed
// 15. For aggregations, always include proper GROUP BY with all non-aggregated columns

// COMMON SEPHORA QUERY PATTERNS:

// Stock Check by SKU and Zipcode:
// SELECT stores, address, in_stock 
// FROM stores 
// WHERE skuld ILIKE '%SKU123%' AND zipcode = '10001'

// Available Products by Brand in Area:
// SELECT s.stores, s.address, s.skuld, b.brand_name
// FROM stores s
// JOIN scraper_a sa ON s.skuld = sa.item_id::text
// JOIN brands b ON sa.brand_id = b.brand_id
// WHERE b.brand_name ILIKE '%fenty%' AND s.zipcode = '90210' AND s.in_stock = 'y'

// All Stores with Stock in Zipcode:
// SELECT stores, address, skuld, in_stock
// FROM stores
// WHERE zipcode = '10001' AND in_stock = 'y'
// ORDER BY stores
// LIMIT 100

// Products Out of Stock by Brand:
// SELECT DISTINCT s.skuld, b.brand_name, COUNT(*) as out_of_stock_locations
// FROM stores s
// JOIN scraper_a sa ON s.skuld = sa.item_id::text
// JOIN brands b ON sa.brand_id = b.brand_id
// WHERE b.brand_name ILIKE '%drunk elephant%' AND s.in_stock = 'n'
// GROUP BY s.skuld, b.brand_name
// ORDER BY out_of_stock_locations DESC

// Store Locations by Zipcode:
// SELECT DISTINCT stores, address, zipcode
// FROM stores
// WHERE zipcode IN ('10001', '10002', '10003')
// ORDER BY zipcode, stores

// VALIDATION:
// 16. Verify joins use correct foreign key relationships:
//     - stores.zipcode → zipcodes.zipcode
//     - scraper_a.brand_id → brands.brand_id
//     - stores.skuld relates to scraper_a.item_id (may need type casting)

// 17. Ensure WHERE clauses use proper operators:
//     - Text: ILIKE, UPPER(), LOWER()
//     - Stock status: = 'y' or = 'n'
//     - Numeric: =, <, >, <=, >=, BETWEEN

// 18. Handle NULL values appropriately:
//     - Use IS NULL or IS NOT NULL
//     - Use COALESCE() for default values

// Remember: Return ONLY the SQL query. No explanations, no comments, no markdown code blocks.

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

// // async function analyzeForVisualization(query, results, sqlQuery) {
// //   if (!results || results.length === 0) {
// //     return { shouldVisualize: false };
// //   }

// //   const columns = Object.keys(results[0]);
// //   const sampleData = results.slice(0, 5);
  
// //   const columnTypes = columns.map(col => {
// //     const sampleValue = results[0][col];
// //     return {
// //       name: col,
// //       type: typeof sampleValue === 'number' ? 'numeric' : 
// //             sampleValue instanceof Date ? 'date' : 'text',
// //       sampleValues: sampleData.map(row => row[col]).slice(0, 3)
// //     };
// //   });

// //   const prompt = `You are a data visualization expert. Analyze this query and data to determine if a chart would be helpful.

// // User Query: "${query}"

// // SQL Query: ${sqlQuery}

// // Data Structure:
// // - Row Count: ${results.length}
// // - Columns: ${JSON.stringify(columnTypes, null, 2)}

// // Sample Data (first 3 rows):
// // ${JSON.stringify(sampleData, null, 2)}

// // Analyze and respond in this EXACT JSON format (no additional text):
// // {
// //   "shouldVisualize": true/false,
// //   "chartType": "bar" | "line" | "pie" | null,
// //   "reasoning": "brief explanation",
// //   "xAxis": "column name for x-axis or labels",
// //   "yAxis": "column name for y-axis or values"
// // }

// // Guidelines:
// // - Use BAR charts for: comparisons, rankings, top N queries, counts by category
// // - Use LINE charts for: time series, trends over time, sequential data
// // - Use PIE charts for: proportions, distributions, percentages, market share
// // - Set shouldVisualize to true if data shows meaningful patterns
// // - Set shouldVisualize to false if single value, detailed listings, or text-heavy results
// // - For xAxis: pick the categorical column (name, brand_name, creator name, etc.)
// // - For yAxis: pick the numeric column (views, likes, comments, sum, count, etc.)

// // Respond ONLY with valid JSON, no other text.`;

// //   try {
// //     const result = await model.generateContent(prompt);
// //     const response = await result.response;
// //     let analysisText = response.text().trim();
    
// //     analysisText = analysisText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
// //     const analysis = JSON.parse(analysisText);
// //     console.log('📊 Visualization Analysis:', analysis);
    
// //     return analysis;
// //   } catch (error) {
// //     console.error('Error analyzing for visualization:', error);
// //     return { shouldVisualize: false };
// //   }
// // }
// async function analyzeForVisualization(query, results, sqlQuery) {
//   if (!results || results.length === 0) {
//     return { shouldVisualize: false };
//   }

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

//   const prompt = `You are a data visualization expert specializing in inventory and analytics systems. Analyze if this query genuinely benefits from visualization.

// User Query: "${query}"
// SQL Query: ${sqlQuery}
// Data Structure:
// - Row Count: ${results.length}
// - Columns: ${JSON.stringify(columnTypes, null, 2)}
// Sample Data (first 3 rows):
// ${JSON.stringify(sampleData, null, 2)}

// CRITICAL DECISION RULES - Only visualize when it adds real value:

// ✅ VISUALIZE when query involves:
// - Comparisons across multiple items (top 5, ranking, which stores have most)
// - Aggregations with GROUP BY (sum, count, average per category)
// - Distribution analysis (stock levels across stores, brands by region)
// - Trend identification (if time-based data exists)
// - Multiple numeric values that benefit from visual comparison (>= 3 data points)

// ❌ DO NOT VISUALIZE when query shows:
// - Single row results (one store, one product, one value)
// - Detailed item listings without aggregation (list of products, store addresses)
// - Simple yes/no answers or binary checks (is item in stock?)
// - Text-heavy results (descriptions, addresses, detailed info)
// - Lookup queries (find SKU, get store details, check availability at specific location)
// - Less than 3 data points (insufficient for meaningful chart)
// - Results are primarily for reading/reference, not comparison

// QUERY INTENT ANALYSIS:
// - "Show me", "list", "find", "what is", "get details" → Usually NO chart (informational)
// - "Compare", "top", "most", "least", "how many", "total", "distribution" → Usually YES chart (analytical)
// - Single product/store questions → NO chart
// - Multiple items comparison → YES chart

// Respond in this EXACT JSON format (no additional text):
// {
//   "shouldVisualize": true/false,
//   "chartType": "bar" | "line" | "pie" | null,
//   "reasoning": "brief explanation of why chart is/isn't helpful here",
//   "xAxis": "column name for x-axis" or null,
//   "yAxis": "column name for y-axis" or null,
//   "confidence": "high" | "medium" | "low"
// }

// Chart Type Selection (only if shouldVisualize is true):
// - BAR: Comparisons, rankings, counts by category (most common for inventory)
// - LINE: Time series, sequential trends (date-based data)
// - PIE: Proportions when showing parts of a whole (limit to 5-7 categories max)

// Set confidence based on:
// - "high": Clear analytical query with good numeric data for comparison
// - "medium": Could go either way, but chart might help
// - "low": Borderline case, table probably better

// Respond ONLY with valid JSON, no other text.`;

//   try {
//     const result = await model.generateContent(prompt);
//     const response = await result.response;
//     let analysisText = response.text().trim();
    
//     analysisText = analysisText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
//     const analysis = JSON.parse(analysisText);
    
//     // Additional safety checks - override AI if data clearly isn't chart-worthy
//     if (results.length === 1) {
//       console.log('📊 Override: Single row result - no chart needed');
//       return { shouldVisualize: false, reasoning: 'Single row result - table view is clearer' };
//     }
    
//     if (results.length < 3 && analysis.shouldVisualize) {
//       console.log('📊 Override: Too few data points for meaningful chart');
//       return { shouldVisualize: false, reasoning: 'Insufficient data points for visualization' };
//     }
    
//     // Check if there's at least one numeric column for charting
//     const hasNumericData = columnTypes.some(col => col.type === 'numeric');
//     if (analysis.shouldVisualize && !hasNumericData) {
//       console.log('📊 Override: No numeric data available for chart');
//       return { shouldVisualize: false, reasoning: 'No numeric data to visualize' };
//     }
    
//     // Only show chart if confidence is high or medium
//     if (analysis.confidence === 'low') {
//       console.log('📊 Low confidence in visualization benefit - skipping chart');
//       return { shouldVisualize: false, reasoning: analysis.reasoning };
//     }
    
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

//   const prompt = `You are an intelligent Instagram analytics assistant. Analyze the query results and provide a natural, conversational answer.

// User's Question: "${originalQuery}"

// Query Results (${rows.length} total rows):
// ${dataString}

// ${vizContext}

// Instructions:
// use appropriate emojis to make it engaging (📊 for stats, 🏆 for leaders, 📈 for growth, etc.)
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
    
//     if (typeof value === 'number' && (key.includes('view') || key.includes('like') || key.includes('comment') || key.includes('sum') || key.includes('total') || key.includes('count'))) {
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
//     message: 'AI-Powered Instagram Analytics API is running',
//     features: Object.keys(FEATURE_SCHEMAS),
//     endpoints: {
//       health: '/health',
//       nlToSql: '/api/nl-query',
//       schema: '/api/schema',
//       exportExcel: '/api/export-excel',
//       features: '/api/features'
//     }
//   });
// });

// app.get('/health', (req, res) => {
//   res.json({ status: 'healthy', timestamp: new Date().toISOString() });
// });

// // Get available features
// app.get('/api/features', (req, res) => {
//   res.json({ 
//     success: true, 
//     features: Object.entries(FEATURE_SCHEMAS).map(([key, value]) => ({
//       id: key,
//       description: value.description,
//       tables: value.tables
//     }))
//   });
// });

// // Get schema for specific feature
// app.get('/api/schema', async (req, res) => {
//   try {
//     const featureType = req.query.feature || 'INSTAGRAM_ANALYZER';
    
//     if (!FEATURE_SCHEMAS[featureType]) {
//       return res.status(400).json({
//         success: false,
//         error: `Invalid feature type. Available: ${Object.keys(FEATURE_SCHEMAS).join(', ')}`
//       });
//     }
    
//     const schema = await getDatabaseSchema(featureType);
//     res.json({ 
//       success: true, 
//       feature: featureType,
//       schema 
//     });
//   } catch (error) {
//     console.error('Error fetching schema:', error);
//     res.status(500).json({ 
//       success: false, 
//       error: 'Failed to fetch database schema' 
//     });
//   }
// });

// // Enhanced NL Query with feature support
// app.post('/api/nl-query', async (req, res) => {
//   try {
//     const { query, feature = 'INSTAGRAM_ANALYZER' } = req.body;
    
//     if (!query) {
//       return res.status(400).json({
//         success: false,
//         error: 'Query is required'
//       });
//     }

//     if (!FEATURE_SCHEMAS[feature]) {
//       return res.status(400).json({
//         success: false,
//         error: `Invalid feature type. Available: ${Object.keys(FEATURE_SCHEMAS).join(', ')}`
//       });
//     }
    
//     console.log(`📝 [${feature}] Received query:`, query);
    
//     // Step 1: Get schema for specific feature
//     const schema = await getDatabaseSchema(feature);
//     console.log(`📊 [${feature}] Schema fetched:`, Object.keys(schema));
    
//     if (Object.keys(schema).length === 0) {
//       return res.status(404).json({
//         success: false,
//         error: `No tables found for feature: ${feature}. Tables needed: ${FEATURE_SCHEMAS[feature].tables.join(', ')}`
//       });
//     }
    
//     // Step 2: Generate SQL
//     const sqlQuery = await generateSQL(query, schema, feature);
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
//       feature: feature,
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
//     res.setHeader('Content-Disposition', `attachment; filename=instagram_analytics_${Date.now()}.xlsx`);
    
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

// const PORT = process.env.PORT || 8000;
// app.listen(PORT, () => {
//   console.log(`🚀 AI-Powered Instagram Analytics Server running on port ${PORT}`);
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
// const genAI = new GoogleGenerativeAI("AIzaSyBEnIfY-I1kt2ICFOI4NBW0G3SEakTcDx8");
// const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

// // Initialize PostgreSQL connection
// const pool = new Pool({
//   connectionString: "postgresql://neondb_owner:npg_2B6QXDatPwlp@ep-sparkling-lab-a15aax1d-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
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

// // ============= FEATURE CONFIGURATION =============

// const FEATURE_SCHEMAS = {
//   INSTAGRAM_ANALYZER: {
//     tables: ['brands', 'products', 'store_inventory','zipcodes'],
//     description: 'Sephora Inventory Database',
//     contextInfo: `Sephora product inventory and store management system`
//   },
//   MAIN_APP: {
//     tables: ['User', 'Topic', 'Chat', 'Notification', 'Organization', 'Whitelist', 'ScrapedData'],
//     description: 'Main Application Database',
//     contextInfo: 'Chat application with users, topics, and conversations'
//   }
// };

// // ============= Enhanced Schema Functions =============

// async function getDatabaseSchema(featureType = 'INSTAGRAM_ANALYZER') {
//   const client = await pool.connect();
//   try {
//     const allowedTables = FEATURE_SCHEMAS[featureType].tables;
    
//     // Convert table names to lowercase for case-insensitive comparison
//     const tableConditions = allowedTables.map(t => `'${t.toLowerCase()}'`).join(',');
    
//     const query = `
//       SELECT 
//         table_name,
//         column_name,
//         data_type,
//         is_nullable,
//         column_default
//       FROM information_schema.columns
//       WHERE table_schema = 'public'
//         AND LOWER(table_name) IN (${tableConditions})
//       ORDER BY table_name, ordinal_position;
//     `;
    
//     const result = await client.query(query);
    
//     if (result.rows.length === 0) {
//       console.warn(`⚠️ No tables found for feature: ${featureType}`);
//       console.warn(`Looking for tables: ${allowedTables.join(', ')}`);
//     }
    
//     const schemaByTable = {};
//     result.rows.forEach(row => {
//       if (!schemaByTable[row.table_name]) {
//         schemaByTable[row.table_name] = [];
//       }
//       schemaByTable[row.table_name].push({
//         column: row.column_name,
//         type: row.data_type,
//         nullable: row.is_nullable === 'YES',
//         default: row.column_default
//       });
//     });
    
//     console.log(`📊 Schema loaded for ${featureType}:`, Object.keys(schemaByTable));
//     return schemaByTable;
//   } catch (error) {
//     console.error('Error fetching schema:', error);
//     throw error;
//   } finally {
//     client.release();
//   }
// }

// async function generateSQL(naturalLanguageQuery, schema, featureType) {
//   const schemaText = Object.entries(schema)
//     .map(([table, columns]) => {
//       const columnDefs = columns
//         .map(col => `  - ${col.column} (${col.type})`)
//         .join('\n');
//       return `Table: ${table}\n${columnDefs}`;
//     })
//     .join('\n\n');

//   const featureContext = FEATURE_SCHEMAS[featureType].contextInfo;
// const prompt = `You are an expert SQL query generator for Sephora's inventory management system. Convert the following natural language query into a precise PostgreSQL query.

// ${featureContext}

// Database Schema (ONLY use these exact tables and columns):
// ${schemaText}

// Natural Language Query: ${naturalLanguageQuery}

// CRITICAL RULES:
// 1. Generate ONLY the raw SQL query - no markdown, comments, explanations, or additional text
// 2. Start directly with SELECT, INSERT, UPDATE, or DELETE
// 3. Use ONLY the tables and columns shown in the schema above
// 4. Match table and column names EXACTLY as defined in the schema

// SEPHORA-SPECIFIC INTELLIGENCE:
// 5. Product Identification:
//    - "SKU" or "product ID" → use 'skuld' column from stores table
//    - "item ID" → use 'item_id' from scraper_a table
//    - Always treat SKU/product identifiers as case-insensitive (use UPPER() for consistency)

// 6. Stock Availability:
//    - "in stock", "available", "has stock" → WHERE in_stock = 'y'
//    - "out of stock", "not available", "unavailable" → WHERE in_stock = 'n'
//    - Always use single character: 'y' or 'n' (not 'yes'/'no' or boolean)

// 7. Location/Zipcode Queries:
//    - For zipcode searches: Use EXACT match (zipcode = '12345')
//    - "near", "around", "in area" → search specific zipcode or multiple zipcodes
//    - Join stores with zipcodes table when validating locations
//    - Always format zipcodes as strings with leading zeros preserved

// 8. Brand Queries:
//    - Brand names are case-insensitive: Use brand_name ILIKE '%brandname%'
//    - Link brands through: brands → scraper_a (via brand_id) → stores (via item_id/skuld relationship)
//    - Common brands: Fenty Beauty, Rare Beauty, Drunk Elephant, Huda Beauty, HAUS LABS BY LADY GAGA, etc.

// 9. Store Queries:
//    - Store names: Use stores ILIKE '%storename%' for partial matches
//    - Include address when showing store locations
//    - Default sort: by store name or zipcode

// 10. Store Inventory Queries (MOST IMPORTANT):
//    - ALWAYS join store_inventory table when asking about product availability, stock levels, or inventory
//    - The store_inventory table contains: store_id, product_id, quantity_available, last_updated, and other inventory columns
//    - When user asks about products in stores, ALWAYS include ALL columns from store_inventory in SELECT
//    - Join pattern: store_inventory → products (via product_id) → brands (via brand_id)
//    - Join pattern: store_inventory → stores (via store_id for store location info)
//    - Example: For "products in zipcode X", join store_inventory with products and stores tables

// TEXT MATCHING RULES (Case-Insensitive Intelligence):
// 11. For ALL text searches, use ILIKE with wildcards:
//     - Product names: column_name ILIKE '%search_term%'
//     - Brand names: brand_name ILIKE '%search_term%'
//     - Store names: stores ILIKE '%store_name%'
//     - Addresses: address ILIKE '%location%'

// 12. For exact matches where case doesn't matter:
//     - UPPER(column_name) = UPPER('value')
//     - Especially for: SKU codes, zipcodes (if alphanumeric)

// 13. For partial word matching:
//     - Use: column_name ILIKE '%' || LOWER('search_term') || '%'

// QUERY OPTIMIZATION:
// 14. Always limit results to 100 rows unless user specifies otherwise
// 15. Use proper indexes: skuld, zipcode, brand_id, in_stock are indexed
// 16. For aggregations, always include proper GROUP BY with all non-aggregated columns

// COMMON SEPHORA QUERY PATTERNS WITH STORE_INVENTORY:

// Stock Check by Product and Zipcode (with full inventory details):
// SELECT 
//   si.store_id, si.product_id, si.quantity_available, si.last_updated,
//   p.product_name, b.brand_name, s.store_name, s.store_address, s.store_zipcode
// FROM store_inventory si
// JOIN products p ON si.product_id = p.product_id
// JOIN brands b ON p.brand_id = b.brand_id
// JOIN stores s ON si.store_id = s.store_id
// WHERE s.store_zipcode = '10001' AND si.quantity_available > 0
// LIMIT 100

// Available Products by Brand in Area (complete inventory info):
// SELECT 
//   si.*, p.product_name, b.brand_name, s.store_name, s.store_address
// FROM store_inventory si
// JOIN products p ON si.product_id = p.product_id
// JOIN brands b ON p.brand_id = b.brand_id
// JOIN stores s ON si.store_id = s.store_id
// WHERE b.brand_name ILIKE '%fenty%' AND s.store_zipcode = '90210' AND si.quantity_available > 0
// ORDER BY s.store_name
// LIMIT 100

// All Inventory by Zipcode (all store_inventory columns):
// SELECT 
//   si.store_id, si.product_id, si.quantity_available, si.last_updated,
//   si.reorder_point, si.reorder_quantity,
//   p.product_name, s.store_name, s.store_address, s.store_zipcode
// FROM store_inventory si
// JOIN products p ON si.product_id = p.product_id
// JOIN stores s ON si.store_id = s.store_id
// WHERE s.store_zipcode = '10001'
// ORDER BY s.store_name, p.product_name
// LIMIT 100

// Low Stock Products (inventory management):
// SELECT 
//   si.*, p.product_name, b.brand_name, s.store_name, s.store_address
// FROM store_inventory si
// JOIN products p ON si.product_id = p.product_id
// JOIN brands b ON p.brand_id = b.brand_id
// JOIN stores s ON si.store_id = s.store_id
// WHERE si.quantity_available < 5 AND si.quantity_available > 0
// ORDER BY si.quantity_available ASC
// LIMIT 100

// Out of Stock Products by Brand:
// SELECT 
//   si.store_id, si.product_id, si.quantity_available, si.last_updated,
//   p.product_name, b.brand_name, s.store_name, s.store_address, COUNT(*) as out_of_stock_locations
// FROM store_inventory si
// JOIN products p ON si.product_id = p.product_id
// JOIN brands b ON p.brand_id = b.brand_id
// JOIN stores s ON si.store_id = s.store_id
// WHERE b.brand_name ILIKE '%drunk elephant%' AND si.quantity_available = 0
// GROUP BY si.store_id, si.product_id, si.quantity_available, si.last_updated, 
//          p.product_name, b.brand_name, s.store_name, s.store_address
// ORDER BY out_of_stock_locations DESC
// LIMIT 100

// CRITICAL FOR EXCEL EXPORTS:
// 17. When generating queries that will be exported, ALWAYS SELECT ALL columns from store_inventory:
//     - si.store_id, si.product_id, si.quantity_available, si.last_updated
//     - Plus any other columns in the store_inventory table
//     - Use si.* to get all store_inventory columns, then add joined table columns

// 18. Always include descriptive columns for context:
//     - Product names, brand names, store names, addresses, zipcodes
//     - This makes exported Excel files useful and understandable

// VALIDATION:
// 19. Verify joins use correct foreign key relationships:
//     - store_inventory.product_id → products.product_id
//     - store_inventory.store_id → stores.store_id
//     - products.brand_id → brands.brand_id
//     - stores.zipcode → zipcodes.zipcode

// 20. Ensure WHERE clauses use proper operators:
//     - Text: ILIKE, UPPER(), LOWER()
//     - Stock quantity: =, <, >, <=, >=, BETWEEN
//     - Numeric: =, <, >, <=, >=, BETWEEN

// 21. Handle NULL values appropriately:
//     - Use IS NULL or IS NOT NULL
//     - Use COALESCE() for default values

// Remember: 
// - Return ONLY the SQL query. No explanations, no comments, no markdown code blocks.
// - ALWAYS include ALL store_inventory columns when querying inventory data
// - Make exports comprehensive with all relevant product, brand, and store information

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

// // ============= Enhanced Answer Generation =============

// async function generateIntelligentAnswer(rows, sqlQuery, originalQuery) {
//   if (rows.length === 0) {
//     return 'No results found for your query. Please try a different search or check the zipcode/product details.';
//   }

//   const dataString = JSON.stringify(rows.slice(0, 20), null, 2);

//   const prompt = `You are an intelligent Sephora inventory assistant. Analyze the query results and provide a natural, conversational, and descriptive answer.

// User's Question: "${originalQuery}"

// Query Results (${rows.length} total rows):
// ${dataString}

// Instructions:
// 1. Provide a clear, descriptive summary of the results
// 2. Use appropriate emojis to make it engaging (📦 for products, 🏪 for stores, ✅ for in stock, ❌ for out of stock, 📍 for locations, 💄 for beauty products)
// 3. Format the response with clear sections and bullet points where appropriate
// 4. Include specific numbers, product names, store locations, and availability status
// 5. If there are multiple results, summarize the key findings
// 6. Use bold text (** **) for important information like product names, brand names, and quantities
// 7. Make it easy to read with proper spacing and structure
// 8. Keep the tone professional but friendly
// 9. If showing inventory levels, clearly indicate stock status
// 10. For location-based queries, emphasize store addresses and zipcodes

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
    
//     if (typeof value === 'number' && (key.includes('quantity') || key.includes('count') || key.includes('total'))) {
//       return value.toLocaleString();
//     }
    
//     return value;
//   };
  
//   let response = `Found ${rowCount} result${rowCount > 1 ? 's' : ''}:\n\n`;
  
//   const displayLimit = Math.min(10, rowCount);
//   rows.slice(0, displayLimit).forEach((row, idx) => {
//     response += `📦 Result ${idx + 1}:\n`;
//     columns.forEach(col => {
//       const formattedName = formatColumnName(col);
//       const formattedValue = formatValue(row[col], col);
//       response += `  • ${formattedName}: ${formattedValue}\n`;
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
//   const worksheet = workbook.addWorksheet('Sephora Inventory');
  
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
//     fgColor: { argb: 'FF1f2937' }
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
//     message: 'AI-Powered Sephora Inventory API is running',
//     features: Object.keys(FEATURE_SCHEMAS),
//     endpoints: {
//       health: '/health',
//       nlToSql: '/api/nl-query',
//       schema: '/api/schema',
//       exportExcel: '/api/export-excel',
//       features: '/api/features'
//     }
//   });
// });

// app.get('/health', (req, res) => {
//   res.json({ status: 'healthy', timestamp: new Date().toISOString() });
// });

// // Get available features
// app.get('/api/features', (req, res) => {
//   res.json({ 
//     success: true, 
//     features: Object.entries(FEATURE_SCHEMAS).map(([key, value]) => ({
//       id: key,
//       description: value.description,
//       tables: value.tables
//     }))
//   });
// });

// // Get schema for specific feature
// app.get('/api/schema', async (req, res) => {
//   try {
//     const featureType = req.query.feature || 'INSTAGRAM_ANALYZER';
    
//     if (!FEATURE_SCHEMAS[featureType]) {
//       return res.status(400).json({
//         success: false,
//         error: `Invalid feature type. Available: ${Object.keys(FEATURE_SCHEMAS).join(', ')}`
//       });
//     }
    
//     const schema = await getDatabaseSchema(featureType);
//     res.json({ 
//       success: true, 
//       feature: featureType,
//       schema 
//     });
//   } catch (error) {
//     console.error('Error fetching schema:', error);
//     res.status(500).json({ 
//       success: false, 
//       error: 'Failed to fetch database schema' 
//     });
//   }
// });

// // Enhanced NL Query with feature support (NO VISUALIZATION)
// app.post('/api/nl-query', async (req, res) => {
//   try {
//     const { query, feature = 'INSTAGRAM_ANALYZER' } = req.body;
    
//     if (!query) {
//       return res.status(400).json({
//         success: false,
//         error: 'Query is required'
//       });
//     }

//     if (!FEATURE_SCHEMAS[feature]) {
//       return res.status(400).json({
//         success: false,
//         error: `Invalid feature type. Available: ${Object.keys(FEATURE_SCHEMAS).join(', ')}`
//       });
//     }
    
//     console.log(`📝 [${feature}] Received query:`, query);
    
//     // Step 1: Get schema for specific feature
//     const schema = await getDatabaseSchema(feature);
//     console.log(`📊 [${feature}] Schema fetched:`, Object.keys(schema));
    
//     if (Object.keys(schema).length === 0) {
//       return res.status(404).json({
//         success: false,
//         error: `No tables found for feature: ${feature}. Tables needed: ${FEATURE_SCHEMAS[feature].tables.join(', ')}`
//       });
//     }
    
//     // Step 2: Generate SQL
//     const sqlQuery = await generateSQL(query, schema, feature);
//     console.log('🔧 Generated SQL:', sqlQuery);
    
//     // Step 3: Execute query
//     const results = await executeSQL(sqlQuery);
//     console.log('✅ Query executed, rows:', results.length);
    
//     // Step 4: Generate intelligent answer (no visualization)
//     const answer = await generateIntelligentAnswer(results, sqlQuery, query);
    
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
//       feature: feature
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
    
//     const workbook = await generateExcel(results, query || 'Sephora Inventory Export');
    
//     res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
//     res.setHeader('Content-Disposition', `attachment; filename=sephora_inventory_${Date.now()}.xlsx`);
    
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

// const PORT = process.env.PORT || 8000;
// app.listen(PORT, () => {
//   console.log(`🚀 AI-Powered Sephora Inventory Server running on port ${PORT}`);
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
// const genAI = new GoogleGenerativeAI("AIzaSyBEnIfY-I1kt2ICFOI4NBW0G3SEakTcDx8");
// const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

// // Initialize PostgreSQL connection
// const pool = new Pool({
//   connectionString: "postgresql://neondb_owner:npg_2B6QXDatPwlp@ep-sparkling-lab-a15aax1d-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
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

// // ============= FEATURE CONFIGURATION =============

// const FEATURE_SCHEMAS = {
//   SEPHORA_INVENTORY: {
//     tables: ['store_inventory', 'products', 'brands', 'zipcodes'],
//     description: 'Sephora Inventory Database',
//     contextInfo: `Sephora product inventory and store management system with real-time stock tracking`
//   }
// };

// // ============= Enhanced Schema Functions =============

// async function getDatabaseSchema(featureType = 'SEPHORA_INVENTORY') {
//   const client = await pool.connect();
//   try {
//     const allowedTables = FEATURE_SCHEMAS[featureType].tables;
    
//     const tableConditions = allowedTables.map(t => `'${t.toLowerCase()}'`).join(',');
    
//     const query = `
//       SELECT 
//         table_name,
//         column_name,
//         data_type,
//         is_nullable,
//         column_default
//       FROM information_schema.columns
//       WHERE table_schema = 'public'
//         AND LOWER(table_name) IN (${tableConditions})
//       ORDER BY table_name, ordinal_position;
//     `;
    
//     const result = await client.query(query);
    
//     if (result.rows.length === 0) {
//       console.warn(`⚠️ No tables found for feature: ${featureType}`);
//       console.warn(`Looking for tables: ${allowedTables.join(', ')}`);
//     }
    
//     const schemaByTable = {};
//     result.rows.forEach(row => {
//       if (!schemaByTable[row.table_name]) {
//         schemaByTable[row.table_name] = [];
//       }
//       schemaByTable[row.table_name].push({
//         column: row.column_name,
//         type: row.data_type,
//         nullable: row.is_nullable === 'YES',
//         default: row.column_default
//       });
//     });
    
//     console.log(`📊 Schema loaded for ${featureType}:`, Object.keys(schemaByTable));
//     return schemaByTable;
//   } catch (error) {
//     console.error('Error fetching schema:', error);
//     throw error;
//   } finally {
//     client.release();
//   }
// }

// async function generateSQL(naturalLanguageQuery, schema, featureType) {
//   const schemaText = Object.entries(schema)
//     .map(([table, columns]) => {
//       const columnDefs = columns
//         .map(col => `  - ${col.column} (${col.type})`)
//         .join('\n');
//       return `Table: ${table}\n${columnDefs}`;
//     })
//     .join('\n\n');

//   const featureContext = FEATURE_SCHEMAS[featureType].contextInfo;

// const prompt = `You are an expert SQL query generator for Sephora's inventory management system. Convert natural language queries into precise PostgreSQL queries.

// ${featureContext}

// Database Schema (ONLY use these exact tables and columns):
// ${schemaText}

// Natural Language Query: ${naturalLanguageQuery}

// CRITICAL RULES:
// 1. Generate ONLY the raw SQL query - no markdown, comments, explanations, or additional text
// 2. Start directly with SELECT, INSERT, UPDATE, or DELETE
// 3. Use ONLY the tables and columns shown in the schema above
// 4. Match table and column names EXACTLY as defined in the schema

// SCHEMA STRUCTURE & RELATIONSHIPS:

// Tables:
// 1. store_inventory (Main inventory table)
//    - id: Primary key (SERIAL)
//    - sku_id: Product SKU identifier (VARCHAR(50))
//    - zipcode: Store location zipcode (INTEGER)
//    - store: Store name (VARCHAR(200))
//    - address: Store address (VARCHAR(300))
//    - availability: Stock status (VARCHAR(30)) - values like "In Stock", "Out of Stock", "Limited Stock"
//    - category: Product category (VARCHAR(50))
//    - brand_id: Foreign key to brands (VARCHAR(50))
//    - store_data: Additional store metadata (JSONB)
//    - created_at: Record creation timestamp

// 2. products
//    - product_id: Primary key (VARCHAR(50))
//    - brand: Foreign key to brands.brand_name (VARCHAR(100))
//    - name: Product name (TEXT)
//    - price: Product price (NUMERIC(10,2))
//    - price_text: Price as text (VARCHAR(20))
//    - source_url: Product URL (TEXT)
//    - image: Product image URL (TEXT)
//    - created_at, updated_at: Timestamps

// 3. brands
//    - brand_name: Primary key (VARCHAR(100))
//    - url: Brand website URL (TEXT)
//    - created_at, updated_at: Timestamps

// 4. zipcodes
//    - zipcode: Primary key (INTEGER)
//    - city: City name (VARCHAR(100))
//    - state: State name (VARCHAR(50))
//    - created_at: Timestamp

// KEY RELATIONSHIPS:
// - store_inventory.brand_id → brands.brand_name (use this for brand joins)
// - store_inventory.sku_id → products.product_id (use this for product details)
// - products.brand → brands.brand_name (for product-brand relationship)
// - store_inventory.zipcode → zipcodes.zipcode (for location details)

// SEPHORA-SPECIFIC QUERY INTELLIGENCE:

// 1. Product Identification:
//    - "SKU" or "product ID" → use 'sku_id' column from store_inventory
//    - For product details (name, price, image), JOIN with products table: 
//      JOIN products p ON si.sku_id = p.product_id

// 2. Stock Availability:
//    - "in stock", "available", "has stock" → WHERE availability ILIKE '%in stock%'
//    - "out of stock", "not available" → WHERE availability ILIKE '%out of stock%'
//    - "limited stock", "low stock" → WHERE availability ILIKE '%limited%'
//    - Always use ILIKE for case-insensitive matching

// 3. Location/Zipcode Queries:
//    - For zipcode searches: WHERE si.zipcode = 12345
//    - "near", "around", "in area" → search specific zipcode
//    - Join with zipcodes table for city/state: JOIN zipcodes z ON si.zipcode = z.zipcode
//    - Zipcodes are stored as INTEGER (not strings)

// 4. Brand Queries:
//    - Brand identification: Use store_inventory.brand_id or products.brand
//    - Case-insensitive brand search: WHERE b.brand_name ILIKE '%brandname%'
//    - Join brands: JOIN brands b ON si.brand_id = b.brand_name
//    - Common brands: "HAUS LABS BY LADY GAGA", "Fenty Beauty", "Huda Beauty", "Rare Beauty", "Drunk Elephant"

// 5. Store Queries:
//    - Store names: Use store_inventory.store column
//    - Partial match: WHERE si.store ILIKE '%storename%'
//    - Include address when showing locations
//    - Default sort: ORDER BY si.store, si.zipcode

// 6. Category Queries:
//    - Product categories stored in store_inventory.category
//    - Use: WHERE si.category ILIKE '%category_name%'

// TEXT MATCHING RULES (Case-Insensitive Intelligence):
// 7. For ALL text searches, use ILIKE with wildcards:
//    - Product names: p.name ILIKE '%search_term%'
//    - Brand names: b.brand_name ILIKE '%search_term%'
//    - Store names: si.store ILIKE '%store_name%'
//    - Addresses: si.address ILIKE '%location%'
//    - Availability: si.availability ILIKE '%status%'
//    - Category: si.category ILIKE '%category%'

// 8. For exact matches where case doesn't matter:
//    - UPPER(column_name) = UPPER('value')
//    - Especially for: SKU codes, specific product IDs

// 9. For partial word matching:
//    - Use: column_name ILIKE '%' || LOWER('search_term') || '%'

// QUERY OPTIMIZATION:
// 10. Always limit results to 100 rows unless user specifies otherwise
// 11. Use proper indexes: sku_id, zipcode, brand_id, availability are indexed
// 12. For aggregations, always include proper GROUP BY with all non-aggregated columns
// 13. Use LEFT JOIN for optional relationships, INNER JOIN for required ones

// COMMON SEPHORA QUERY PATTERNS:

// Stock Check by Product and Zipcode:
// SELECT 
//   si.id, si.sku_id, si.zipcode, si.store, si.address, si.availability, si.category,
//   p.name as product_name, p.price, p.brand,
//   b.brand_name, b.url as brand_url,
//   z.city, z.state
// FROM store_inventory si
// LEFT JOIN products p ON si.sku_id = p.product_id
// LEFT JOIN brands b ON si.brand_id = b.brand_name
// LEFT JOIN zipcodes z ON si.zipcode = z.zipcode
// WHERE si.zipcode = 10001 AND si.availability ILIKE '%in stock%'
// ORDER BY si.store
// LIMIT 100

// Available Products by Brand in Area:
// SELECT 
//   si.store, si.address, si.zipcode, si.availability,
//   p.name as product_name, p.price,
//   b.brand_name,
//   z.city, z.state
// FROM store_inventory si
// LEFT JOIN products p ON si.sku_id = p.product_id
// LEFT JOIN brands b ON si.brand_id = b.brand_name
// LEFT JOIN zipcodes z ON si.zipcode = z.zipcode
// WHERE b.brand_name ILIKE '%fenty%' 
//   AND si.zipcode = 90210 
//   AND si.availability ILIKE '%in stock%'
// ORDER BY si.store
// LIMIT 100

// All Products in Zipcode:
// SELECT 
//   si.store, si.address, si.availability,
//   p.name as product_name, p.price,
//   b.brand_name,
//   si.category
// FROM store_inventory si
// LEFT JOIN products p ON si.sku_id = p.product_id
// LEFT JOIN brands b ON si.brand_id = b.brand_name
// WHERE si.zipcode = 10001
// ORDER BY si.store, p.name
// LIMIT 100

// Out of Stock Products by Brand:
// SELECT 
//   si.store, si.address, si.zipcode,
//   p.name as product_name,
//   b.brand_name,
//   z.city, z.state
// FROM store_inventory si
// LEFT JOIN products p ON si.sku_id = p.product_id
// LEFT JOIN brands b ON si.brand_id = b.brand_name
// LEFT JOIN zipcodes z ON si.zipcode = z.zipcode
// WHERE b.brand_name ILIKE '%drunk elephant%' 
//   AND si.availability ILIKE '%out of stock%'
// ORDER BY si.store
// LIMIT 100

// Products by Category:
// SELECT 
//   si.category, si.store, si.address, si.availability,
//   p.name as product_name, p.price,
//   b.brand_name
// FROM store_inventory si
// LEFT JOIN products p ON si.sku_id = p.product_id
// LEFT JOIN brands b ON si.brand_id = b.brand_name
// WHERE si.category ILIKE '%skincare%'
// ORDER BY si.store
// LIMIT 100

// Stores in a Zipcode:
// SELECT DISTINCT
//   si.store, si.address, si.zipcode,
//   z.city, z.state,
//   COUNT(*) as product_count
// FROM store_inventory si
// LEFT JOIN zipcodes z ON si.zipcode = z.zipcode
// WHERE si.zipcode = 98007
// GROUP BY si.store, si.address, si.zipcode, z.city, z.state
// ORDER BY si.store
// LIMIT 100

// Products by SKU:
// SELECT 
//   si.sku_id, si.store, si.address, si.zipcode, si.availability,
//   p.name as product_name, p.price, p.image,
//   b.brand_name
// FROM store_inventory si
// LEFT JOIN products p ON si.sku_id = p.product_id
// LEFT JOIN brands b ON si.brand_id = b.brand_name
// WHERE si.sku_id = '2892438'
// ORDER BY si.store
// LIMIT 100

// CRITICAL FOR EXCEL EXPORTS:
// 14. When generating queries for export, include ALL relevant columns:
//     - Store information (store, address, zipcode, city, state)
//     - Product information (name, price, brand, category)
//     - Stock information (availability, sku_id)
//     - Use descriptive column aliases (AS product_name, AS brand_name, etc.)

// 15. Always include descriptive columns for context:
//     - This makes exported Excel files useful and understandable
//     - Use meaningful aliases for joined columns

// VALIDATION:
// 16. Verify joins use correct foreign key relationships:
//     - store_inventory.sku_id → products.product_id
//     - store_inventory.brand_id → brands.brand_name
//     - products.brand → brands.brand_name
//     - store_inventory.zipcode → zipcodes.zipcode

// 17. Ensure WHERE clauses use proper operators:
//     - Text: ILIKE (case-insensitive), UPPER(), LOWER()
//     - Numbers: =, <, >, <=, >=, BETWEEN
//     - Zipcodes: = (exact match as INTEGER)

// 18. Handle NULL values appropriately:
//     - Use IS NULL or IS NOT NULL
//     - Use COALESCE() for default values
//     - Use LEFT JOIN for optional relationships

// 19. Always use table aliases for clarity:
//     - si = store_inventory
//     - p = products
//     - b = brands
//     - z = zipcodes

// NATURAL LANGUAGE UNDERSTANDING:
// 20. Interpret common questions:
//     - "what's available" → availability ILIKE '%in stock%'
//     - "show me stores" → SELECT DISTINCT store, address
//     - "brands in area" → JOIN brands, WHERE zipcode
//     - "product details" → JOIN products for name, price, image
//     - "near me" → use zipcode from context
//     - "all products" → no availability filter
//     - "out of stock" → availability ILIKE '%out%'

// Remember: 
// - Return ONLY the SQL query with no additional text
// - Always use LEFT JOIN unless relationship is required
// - Include location details (city, state) when relevant
// - Use ILIKE for all text matching (case-insensitive)
// - Zipcodes are INTEGER type
// - availability field contains text like "In Stock", "Out of Stock", "Limited Stock"

// SQL Query:`;

//   try {
//     const result = await model.generateContent(prompt);
//     const response = await result.response;
//     let sqlQuery = response.text().trim();
    
//     sqlQuery = sqlQuery.replace(/```sql\n?/g, '').replace(/```\n?/g, '').trim();
    
//     console.log('🔧 Generated SQL:', sqlQuery);
//     return sqlQuery;
//   } catch (error) {
//     console.error('Error generating SQL:', error);
//     throw error;
//   }
// }

// async function executeSQL(sqlQuery) {
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
//     console.log('✅ Query executed, rows:', result.rows.length);
//     return result.rows;
//   } catch (error) {
//     console.error('❌ SQL Execution Error:', error.message);
//     console.error('Query:', cleanedQuery);
//     throw error;
//   } finally {
//     client.release();
//   }
// }

// // ============= Enhanced Answer Generation =============

// async function generateIntelligentAnswer(rows, sqlQuery, originalQuery) {
//   if (rows.length === 0) {
//     return 'No results found for your query. Please try a different search or check the zipcode/product details.';
//   }

//   const dataString = JSON.stringify(rows.slice(0, 20), null, 2);

//   const prompt = `You are an intelligent Sephora inventory assistant. Analyze the query results and provide a natural, conversational summary.

// User's Question: "${originalQuery}"

// Query Results (${rows.length} total rows):
// ${dataString}

// Instructions:
// 1. Provide a clear, conversational summary of the results
// 2. Use appropriate emojis sparingly (📦 for products, 🏪 for stores, ✅ for in stock, ❌ for out of stock, 📍 for locations)
// 3. Keep it concise - the data will be shown in a table format below your summary
// 4. Highlight key findings: number of stores, brands found, availability status
// 5. If showing store locations, mention the city/state
// 6. For stock queries, summarize overall availability
// 7. Use natural language - avoid repeating all the data (it's shown in the table)
// 8. Keep it under 5 sentences

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
    
//     if (typeof value === 'number' && (key.includes('price'))) {
//       return `$${value.toFixed(2)}`;
//     }
    
//     if (typeof value === 'number') {
//       return value.toLocaleString();
//     }
    
//     return value;
//   };
  
//   let response = `Found ${rowCount} result${rowCount > 1 ? 's' : ''}:\n\n`;
  
//   const displayLimit = Math.min(10, rowCount);
//   rows.slice(0, displayLimit).forEach((row, idx) => {
//     response += `📦 Result ${idx + 1}:\n`;
//     columns.forEach(col => {
//       const formattedName = formatColumnName(col);
//       const formattedValue = formatValue(row[col], col);
//       response += `  • ${formattedName}: ${formattedValue}\n`;
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
//   const worksheet = workbook.addWorksheet('Sephora Inventory');
  
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
//     fgColor: { argb: 'FF1f2937' }
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
//     message: 'AI-Powered Sephora Inventory API is running',
//     features: Object.keys(FEATURE_SCHEMAS),
//     endpoints: {
//       health: '/health',
//       nlToSql: '/api/nl-query',
//       schema: '/api/schema',
//       exportExcel: '/api/export-excel',
//       features: '/api/features'
//     }
//   });
// });

// app.get('/health', (req, res) => {
//   res.json({ status: 'healthy', timestamp: new Date().toISOString() });
// });

// app.get('/api/features', (req, res) => {
//   res.json({ 
//     success: true, 
//     features: Object.entries(FEATURE_SCHEMAS).map(([key, value]) => ({
//       id: key,
//       description: value.description,
//       tables: value.tables
//     }))
//   });
// });

// app.get('/api/schema', async (req, res) => {
//   try {
//     const featureType = req.query.feature || 'SEPHORA_INVENTORY';
    
//     if (!FEATURE_SCHEMAS[featureType]) {
//       return res.status(400).json({
//         success: false,
//         error: `Invalid feature type. Available: ${Object.keys(FEATURE_SCHEMAS).join(', ')}`
//       });
//     }
    
//     const schema = await getDatabaseSchema(featureType);
//     res.json({ 
//       success: true, 
//       feature: featureType,
//       schema 
//     });
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
//     const { query, feature = 'SEPHORA_INVENTORY' } = req.body;
    
//     if (!query) {
//       return res.status(400).json({
//         success: false,
//         error: 'Query is required'
//       });
//     }

//     if (!FEATURE_SCHEMAS[feature]) {
//       return res.status(400).json({
//         success: false,
//         error: `Invalid feature type. Available: ${Object.keys(FEATURE_SCHEMAS).join(', ')}`
//       });
//     }
    
//     console.log(`📝 [${feature}] Received query:`, query);
    
//     const schema = await getDatabaseSchema(feature);
//     console.log(`📊 [${feature}] Schema fetched:`, Object.keys(schema));
    
//     if (Object.keys(schema).length === 0) {
//       return res.status(404).json({
//         success: false,
//         error: `No tables found for feature: ${feature}. Tables needed: ${FEATURE_SCHEMAS[feature].tables.join(', ')}`
//       });
//     }
    
//     const sqlQuery = await generateSQL(query, schema, feature);
    
//     const results = await executeSQL(sqlQuery);
    
//     const answer = await generateIntelligentAnswer(results, sqlQuery, query);
    
//     const hasExportableData = results.length > 0 && typeof results[0] === 'object';
    
//     res.json({
//       success: true,
//       answer,
//       sql: sqlQuery,
//       results: results.slice(0, 100),
//       rowCount: results.length,
//       hasExport: hasExportableData,
//       query: query,
//       feature: feature
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
    
//     const workbook = await generateExcel(results, query || 'Sephora Inventory Export');
    
//     res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
//     res.setHeader('Content-Disposition', `attachment; filename=sephora_inventory_${Date.now()}.xlsx`);
    
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

// process.on('SIGTERM', () => {
//   console.log('SIGTERM signal received: closing HTTP server');
//   pool.end(() => {
//     console.log('Database pool closed');
//   });
// });

// const PORT = process.env.PORT || 8000;
// app.listen(PORT, () => {
//   console.log(`🚀 AI-Powered Sephora Inventory Server running on port ${PORT}`);
//   console.log(`📍 http://localhost:${PORT}`);
//   console.log(`📊 Database Schema:`);
//   console.log(`   - store_inventory (main table)`);
//   console.log(`   - products (product details)`);
//   console.log(`   - brands (brand information)`);
//   console.log(`   - zipcodes (location data)`);
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
const genAI = new GoogleGenerativeAI("AIzaSyBMTzKFV5dpQTym_GH9nUp-U4Dc8Dylhfc");
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

// Initialize PostgreSQL connection
const pool = new Pool({
  connectionString: "postgresql://neondb_owner:npg_2B6QXDatPwlp@ep-sparkling-lab-a15aax1d-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
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
  SEPHORA_INVENTORY: {
    tables: ['store_inventory', 'products', 'brands', 'zipcodes'],
    description: 'Sephora Inventory Database',
    contextInfo: `Sephora product inventory and store management system with real-time stock tracking`
  }
};

// ============= Enhanced Schema Functions =============

async function getDatabaseSchema(featureType = 'SEPHORA_INVENTORY') {
  const client = await pool.connect();
  try {
    const allowedTables = FEATURE_SCHEMAS[featureType].tables;
    
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

const prompt = `You are an expert SQL query generator for Sephora's inventory management system. Convert natural language queries into precise PostgreSQL queries.

${featureContext}

Database Schema (ONLY use these exact tables and columns):
${schemaText}

Natural Language Query: ${naturalLanguageQuery}

CRITICAL RULES:
1. Generate ONLY the raw SQL query - no markdown, comments, explanations, or additional text
2. Start directly with SELECT, INSERT, UPDATE, or DELETE
3. Use ONLY the tables and columns shown in the schema above
4. Match table and column names EXACTLY as defined in the schema

SCHEMA STRUCTURE & RELATIONSHIPS:

Tables:
1. store_inventory (Main inventory table)
   - id: Primary key (SERIAL)
   - sku_id: Product SKU identifier (VARCHAR(50)) - THIS IS THE KEY FIELD
   - zipcode: Store location zipcode (INTEGER)
   - store: Store name (VARCHAR(200))
   - address: Store address (VARCHAR(300))
   - availability: Stock status (VARCHAR(30)) - values like "In Stock", "Out of Stock", "Limited Stock"
   - category: Product category (VARCHAR(50))
   - brand_id: Foreign key to brands (VARCHAR(50))
   - store_data: Additional store metadata (JSONB)
   - created_at: Record creation timestamp

2. products
   - product_id: Primary key (VARCHAR(50)) - NOT USED FOR JOINS
   - brand: Foreign key to brands.brand_name (VARCHAR(100))
   - name: Product name (TEXT)
   - price: Product price (NUMERIC(10,2))
   - price_text: Price as text (VARCHAR(20))
   - source_url: Product URL (TEXT) - Contains skuId parameter
   - image: Product image URL (TEXT)
   - created_at, updated_at: Timestamps

3. brands
   - brand_name: Primary key (VARCHAR(100))
   - url: Brand website URL (TEXT)
   - created_at, updated_at: Timestamps

4. zipcodes
   - zipcode: Primary key (INTEGER)
   - city: City name (VARCHAR(100))
   - state: State name (VARCHAR(50))
   - created_at: Timestamp

CRITICAL JOIN RELATIONSHIP:
⚠️ MOST IMPORTANT: To join store_inventory with products, use the product_id:

JOIN products p ON si.sku_id = p.product_id

The sku_id field in store_inventory contains the product_id from the products table.
For example:
- store_inventory.sku_id = '500314' matches products.product_id = '500314'
- store_inventory.sku_id = '510570' matches products.product_id = '510570'

CORRECT RELATIONSHIPS:
- store_inventory.sku_id → products.product_id ✅ USE THIS!
- store_inventory.brand_id → brands.brand_name
- products.brand → brands.brand_name
- store_inventory.zipcode → zipcodes.zipcode

NEVER USE:
- SUBSTRING extractions from source_url ❌ WRONG!
- Any regex patterns on source_url ❌ WRONG!

SEPHORA-SPECIFIC QUERY INTELLIGENCE:

1. Product Identification:
   - "SKU" or "product ID" → use 'sku_id' column from store_inventory
   - The sku_id in store_inventory matches product_id in products table
   - For product details (name, price, source_url ,image), ALWAYS JOIN like this:
     JOIN products p ON si.sku_id = p.product_id
   - Example: si.sku_id = '500314' joins with p.product_id = '500314'

2. Stock Availability:
   - "in stock", "available", "has stock" → WHERE availability ILIKE '%in stock%'
   - "out of stock", "not available" → WHERE availability ILIKE '%out of stock%'
   - "limited stock", "low stock" → WHERE availability ILIKE '%limited%'
   - Always use ILIKE for case-insensitive matching

3. Location/Zipcode Queries:
   - For zipcode searches: WHERE si.zipcode = 12345
   - "near", "around", "in area" → search specific zipcode
   - Join with zipcodes table for city/state: JOIN zipcodes z ON si.zipcode = z.zipcode
   - Zipcodes are stored as INTEGER (not strings)

4. Brand Queries:
   - Brand identification: Use store_inventory.brand_id or products.brand
   - Case-insensitive brand search: WHERE b.brand_name ILIKE '%brandname%'
   - Join brands: JOIN brands b ON si.brand_id = b.brand_name
   - Common brands: "HAUS LABS BY LADY GAGA", "Fenty Beauty", "Huda Beauty", "Rare Beauty", "Drunk Elephant"

5. Store Queries:
   - Store names: Use store_inventory.store column
   - Partial match: WHERE si.store ILIKE '%storename%'
   - Include address when showing locations
   - Default sort: ORDER BY si.store, si.zipcode

6. Category Queries:
   - Product categories stored in store_inventory.category
   - Use: WHERE si.category ILIKE '%category_name%'

TEXT MATCHING RULES (Case-Insensitive Intelligence):
7. For ALL text searches, use ILIKE with wildcards:
   - Product names: p.name ILIKE '%search_term%'
   - Brand names: b.brand_name ILIKE '%search_term%'
   - Store names: si.store ILIKE '%store_name%'
   - Addresses: si.address ILIKE '%location%'
   - Availability: si.availability ILIKE '%status%'
   - Category: si.category ILIKE '%category%'

8. For exact matches where case doesn't matter:
   - UPPER(column_name) = UPPER('value')
   - Especially for: SKU codes, specific product IDs

9. For partial word matching:
   - Use: column_name ILIKE '%' || LOWER('search_term') || '%'

QUERY OPTIMIZATION:
10. Always limit results to 100 rows unless user specifies otherwise
11. Use proper indexes: sku_id, zipcode, brand_id, availability are indexed
12. For aggregations, always include proper GROUP BY with all non-aggregated columns
13. Use LEFT JOIN for optional relationships, INNER JOIN for required ones

COMMON SEPHORA QUERY PATTERNS (WITH CORRECT JOIN):

Stock Check by Product and Zipcode:
SELECT 
  si.id, si.sku_id, si.zipcode, si.store, si.address, si.availability, si.category,
  p.name as product_name, p.price, p.brand, p.source_url,p.image, p.source_url,
  b.brand_name, b.url as brand_url,
  z.city, z.state
FROM store_inventory si
LEFT JOIN products p ON si.sku_id = p.product_id
LEFT JOIN brands b ON si.brand_id = b.brand_name
LEFT JOIN zipcodes z ON si.zipcode = z.zipcode
WHERE si.zipcode = 10001 AND si.availability ILIKE '%in stock%'
ORDER BY si.store
LIMIT 100

Available Products by Brand in Area:
SELECT 
  si.store, si.address, si.zipcode, si.availability, si.sku_id,
  p.name as product_name, p.price, p.source_url,p.image,
  b.brand_name,
  z.city, z.state
FROM store_inventory si
LEFT JOIN products p ON si.sku_id = p.product_id
LEFT JOIN brands b ON si.brand_id = b.brand_name
LEFT JOIN zipcodes z ON si.zipcode = z.zipcode
WHERE b.brand_name ILIKE '%fenty%' 
  AND si.zipcode = 90210 
  AND si.availability ILIKE '%in stock%'
ORDER BY si.store
LIMIT 100

All Products in Zipcode:
SELECT 
  si.store, si.address, si.availability, si.sku_id,
  p.name as product_name, p.price, p.source_url ,p.image,
  b.brand_name,
  si.category
FROM store_inventory si
LEFT JOIN products p ON si.sku_id = p.product_id
LEFT JOIN brands b ON si.brand_id = b.brand_name
WHERE si.zipcode = 10001
ORDER BY si.store, p.name
LIMIT 100

Out of Stock Products by Brand:
SELECT 
  si.store, si.address, si.zipcode, si.sku_id,
  p.name as product_name, p.price, p.source_url,p.image,
  b.brand_name,
  z.city, z.state
FROM store_inventory si
LEFT JOIN products p ON si.sku_id = p.product_id
LEFT JOIN brands b ON si.brand_id = b.brand_name
LEFT JOIN zipcodes z ON si.zipcode = z.zipcode
WHERE b.brand_name ILIKE '%drunk elephant%' 
  AND si.availability ILIKE '%out of stock%'
ORDER BY si.store
LIMIT 100

Products by Category:
SELECT 
  si.category, si.store, si.address, si.availability, si.sku_id,
  p.name as product_name, p.price, p.source_url, p.image,
  b.brand_name
FROM store_inventory si
LEFT JOIN products p ON si.sku_id = p.product_id
LEFT JOIN brands b ON si.brand_id = b.brand_name
WHERE si.category ILIKE '%skincare%'
ORDER BY si.store
LIMIT 100

Stores in a Zipcode:
SELECT DISTINCT
  si.store, si.address, si.zipcode,
  z.city, z.state,
  COUNT(DISTINCT si.sku_id) as product_count
FROM store_inventory si
LEFT JOIN zipcodes z ON si.zipcode = z.zipcode
WHERE si.zipcode = 98007
GROUP BY si.store, si.address, si.zipcode, z.city, z.state
ORDER BY si.store
LIMIT 100

Products by SKU ID (searching by specific sku_id):
SELECT 
  si.sku_id, si.store, si.address, si.zipcode, si.availability, si.category,
  p.name as product_name, p.price, p.image, p.source_url,
  b.brand_name
FROM store_inventory si
LEFT JOIN products p ON si.sku_id = p.product_id
LEFT JOIN brands b ON si.brand_id = b.brand_name
WHERE si.sku_id = '500314'
ORDER BY si.store
LIMIT 100

Search by Product Name (when user mentions a product):
SELECT 
  si.sku_id, si.store, si.address, si.zipcode, si.availability,
  p.name as product_name, p.price, p.image,p.source_url,
  b.brand_name,
  z.city, z.state
FROM store_inventory si
LEFT JOIN products p ON si.sku_id = p.product_id
LEFT JOIN brands b ON si.brand_id = b.brand_name
LEFT JOIN zipcodes z ON si.zipcode = z.zipcode
WHERE p.name ILIKE '%foundation brush%'
ORDER BY si.store
LIMIT 100

CRITICAL FOR EXCEL EXPORTS:
14. When generating queries for export, include ALL relevant columns:
    - Store information (store, address, zipcode, city, state)
    - Product information (name, price, brand, category, sku_id, image, source_url)
    - Stock information (availability)
    - Use descriptive column aliases (AS product_name, AS brand_name, etc.)

15. Always include descriptive columns for context:
    - This makes exported Excel files useful and understandable
    - Use meaningful aliases for joined columns

VALIDATION:
16. Verify joins use correct relationship:
    - store_inventory.sku_id → SUBSTRING(products.source_url FROM 'skuId=([0-9]+)') ✅
    - store_inventory.brand_id → brands.brand_name
    - products.brand → brands.brand_name
    - store_inventory.zipcode → zipcodes.zipcode

17. Ensure WHERE clauses use proper operators:
    - Text: ILIKE (case-insensitive), UPPER(), LOWER()
    - Numbers: =, <, >, <=, >=, BETWEEN
    - Zipcodes: = (exact match as INTEGER)

18. Handle NULL values appropriately:
    - Use IS NULL or IS NOT NULL
    - Use COALESCE() for default values
    - Use LEFT JOIN for optional relationships

19. Always use table aliases for clarity:
    - si = store_inventory
    - p = products
    - b = brands
    - z = zipcodes

NATURAL LANGUAGE UNDERSTANDING:
20. Interpret common questions:
    - "what's available" → availability ILIKE '%in stock%'
    - "show me stores" → SELECT DISTINCT store, address
    - "brands in area" → JOIN brands, WHERE zipcode
    - "product details" → JOIN products for name, price, image, source_url
    - "near me" → use zipcode from context
    - "all products" → no availability filter
    - "out of stock" → availability ILIKE '%out%'
    - "check stock for SKU 2597581" → WHERE si.sku_id = '2597581'
    - "products in 90087" → WHERE si.zipcode = 90087

Remember: 
- Return ONLY the SQL query with no additional text
- ALWAYS use: JOIN products p ON si.sku_id = SUBSTRING(p.source_url FROM 'skuId=([0-9]+)')
- The regex 'skuId=([0-9]+)' extracts digits after "skuId=" regardless of URL format
- NEVER use: JOIN products p ON si.sku_id = p.product_id
- Always use LEFT JOIN unless relationship is required
- Include location details (city, state) when relevant
- Use ILIKE for all text matching (case-insensitive)
- Zipcodes are INTEGER type
- availability field contains text like "In Stock", "Out of Stock", "Limited Stock"
- The sku_id field matches the skuId parameter extracted from source_url

SQL Query:`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let sqlQuery = response.text().trim();
    
    sqlQuery = sqlQuery.replace(/```sql\n?/g, '').replace(/```\n?/g, '').trim();
    
    console.log('🔧 Generated SQL:', sqlQuery);
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
    console.log('✅ Query executed, rows:', result.rows.length);
    return result.rows;
  } catch (error) {
    console.error('❌ SQL Execution Error:', error.message);
    console.error('Query:', cleanedQuery);
    throw error;
  } finally {
    client.release();
  }
}

// ============= Enhanced Answer Generation =============

async function generateIntelligentAnswer(rows, sqlQuery, originalQuery) {
  if (rows.length === 0) {
    return 'No results found for your query. Please try a different search or check the zipcode/product details.';
  }

  const dataString = JSON.stringify(rows.slice(0, 20), null, 2);

  const prompt = `You are an intelligent Sephora inventory assistant. Analyze the query results and provide a natural, conversational summary.

User's Question: "${originalQuery}"

Query Results (${rows.length} total rows):
${dataString}

Instructions:
1. Provide a clear, conversational summary of the results
2. Use appropriate emojis sparingly (📦 for products, 🏪 for stores, ✅ for in stock, ❌ for out of stock, 📍 for locations)
3. Keep it concise - the data will be shown in a table format below your summary
4. Highlight key findings: number of stores, brands found, availability status
5. If showing store locations, mention the city/state
6. For stock queries, summarize overall availability
7. Use natural language - avoid repeating all the data (it's shown in the table)
8. Keep it under 5 sentences

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
    
    if (typeof value === 'number' && (key.includes('price'))) {
      return `$${value.toFixed(2)}`;
    }
    
    if (typeof value === 'number') {
      return value.toLocaleString();
    }
    
    return value;
  };
  
  let response = `Found ${rowCount} result${rowCount > 1 ? 's' : ''}:\n\n`;
  
  const displayLimit = Math.min(10, rowCount);
  rows.slice(0, displayLimit).forEach((row, idx) => {
    response += `📦 Result ${idx + 1}:\n`;
    columns.forEach(col => {
      const formattedName = formatColumnName(col);
      const formattedValue = formatValue(row[col], col);
      response += `  • ${formattedName}: ${formattedValue}\n`;
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
  const worksheet = workbook.addWorksheet('Sephora Inventory');
  
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
    fgColor: { argb: 'FF1f2937' }
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
    message: 'AI-Powered Sephora Inventory API is running',
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

app.get('/api/schema', async (req, res) => {
  try {
    const featureType = req.query.feature || 'SEPHORA_INVENTORY';
    
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

app.post('/api/nl-query', async (req, res) => {
  try {
    const { query, feature = 'SEPHORA_INVENTORY' } = req.body;
    
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
    
    const schema = await getDatabaseSchema(feature);
    console.log(`📊 [${feature}] Schema fetched:`, Object.keys(schema));
    
    if (Object.keys(schema).length === 0) {
      return res.status(404).json({
        success: false,
        error: `No tables found for feature: ${feature}. Tables needed: ${FEATURE_SCHEMAS[feature].tables.join(', ')}`
      });
    }
    
    const sqlQuery = await generateSQL(query, schema, feature);
    
    const results = await executeSQL(sqlQuery);
    
    const answer = await generateIntelligentAnswer(results, sqlQuery, query);
    
    const hasExportableData = results.length > 0 && typeof results[0] === 'object';
    
    res.json({
      success: true,
      answer,
      sql: sqlQuery,
      results: results.slice(0, 100),
      rowCount: results.length,
      hasExport: hasExportableData,
      query: query,
      feature: feature
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
    
    const workbook = await generateExcel(results, query || 'Sephora Inventory Export');
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=sephora_inventory_${Date.now()}.xlsx`);
    
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  pool.end(() => {
    console.log('Database pool closed');
  });
});
app.listen(PORT, () => {
  console.log(`🚀 AI-Powered Sephora Inventory Server running on port ${PORT}`);
  console.log(`📍 http://localhost:${PORT}`);
  console.log(`📊 Database Schema:`);
  console.log(`   - store_inventory (main table)`);
  console.log(`   - products (product details)`);
  console.log(`   - brands (brand information)`);
  console.log(`   - zipcodes (location data)`);
});

module.exports = app;

require("dotenv").config();
const mysql = require("mysql2");

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "eureka",
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

pool.getConnection((err, connection) => {
  if (err) {
    console.error("Database connection error:", err.message);
  } else {
    console.log(`Connected to MariaDB at ${process.env.DB_HOST || "localhost"}:${process.env.DB_PORT || 3306}`);
    connection.release();
  }
});

module.exports = pool.promise();

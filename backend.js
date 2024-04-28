const express = require('express');
const multer = require('multer');
const path = require('path');
const mysql = require('mysql');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

const pool = mysql.createPool({
  connectionLimit: 10,
  host: 'localhost',
  user: 'your_mysql_user',
  password: 'your_mysql_password',
  database: 'your_database_name'
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const fileId = uuidv4();
    const ext = path.extname(file.originalname);
    cb(null, fileId + ext);
  }
});

const upload = multer({ storage });

app.post('/upload', upload.single('file'), (req, res) => {
  const { faculty, course } = req.body;
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  pool.query(
    'INSERT INTO documents (id, faculty, course, filename, originalname, path) VALUES (?, ?, ?, ?, ?, ?)',
    [uuidv4(), faculty, course, file.filename, file.originalname, file.path],
    (error, results) => {
      if (error) {
        console.error('Error uploading document to database:', error);
        return res.status(500).json({ error: 'An error occurred while uploading the document' });
      }

      res.status(201).json({ message: 'File uploaded successfully', document: results.insertId });
    }
  );
});

app.get('/download/:id', (req, res) => {
  const { id } = req.params;

  pool.query(
    'SELECT * FROM documents WHERE id = ?',
    [id],
    (error, results) => {
      if (error) {
        console.error('Error retrieving document from database:', error);
        return res.status(500).json({ error: 'An error occurred while retrieving the document' });
      }

      if (results.length === 0) {
        return res.status(404).json({ error: 'Document not found' });
      }

      const document = results[0];
      const filePath = path.join(__dirname, document.path);

      res.download(filePath, document.originalname, err => {
        if (err) {
          console.error('Error downloading file:', err);
          res.status(500).json({ error: 'An error occurred while downloading the file' });
        }
      });
    }
  );
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

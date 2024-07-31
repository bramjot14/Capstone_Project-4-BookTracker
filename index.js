import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

const app = express();
const port = 3000;
const API_URL = "https://covers.openlibrary.org/b/isbn/";

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "books",
  password: "Chauhan@123",
  port: 5432,
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let books = [
  { id: 1, title: "You Can Negotiate Anything - by Herb Cohen", date: "2023-08-02", rating: 10 },
  { id: 2, title: "The Listening Book - by W.A. Mathieu", date: "2021-09-03", rating: 9 },
  { id: 3, title: "Philosophy of Software Design - by John K. Ousterhout", date: "2024-06-10", rating: 8 },
  { id: 4, title: "Chile Culture Smart - by Caterina Perrone", date: "2024-06-02", rating: 6 },
  { id: 5, title: "Awaken the Giant Within - by Tony Robbins", date: "2022-06-22", rating: 5 },
  { id: 6, title: "Barking Up the Wrong Tree - by Eric Barker", date: "2017-11-04", rating: 4 },
]; // NOTE - summary, notes and cover_url are also in the database but not included here.

app.get("/", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM books ORDER BY rating DESC");

    result.rows.forEach(book => {
      book.date = new Date(book.date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit'
      });
    });

    res.render("index.ejs", {
      listTitle: "By Rating",
      listBooks: result.rows
    });
  } catch (err) {
    console.error("Failed to fetch data:", err.message);
    res.render("index.ejs", {
      listTitle: "Today",
      listBooks: [],
      error: err.message
    });
  }
});

app.get("/notes", async (req, res) => {
  const notesId = req.query.notesId;
  try {
    const resultBook = await db.query("SELECT * FROM books WHERE id = $1", [notesId]);
    if (resultBook.rows.length > 0) {
      res.render("notes.ejs", {
        book: resultBook.rows[0],
        notes: resultBook.rows[0].notes || "No notes available",
      });
    } else {
      res.status(404).send("Book not found");
    }
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).send("Server Error");
  }
});

app.get("/title", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM books ORDER BY title ASC");

    result.rows.forEach(book => {
      book.date = new Date(book.date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit'
      });
    });

    res.render("index.ejs", {
      listTitle: "By Title",
      listBooks: result.rows
    });
  } catch (err) {
    console.error("Failed to fetch data:", err.message);
  }
});

app.get("/date", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM books ORDER BY date DESC");

    result.rows.forEach(book => {
      book.date = new Date(book.date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit'
      });
    });

    res.render("index.ejs", {
      listTitle: "By Date",
      listBooks: result.rows
    });
  } catch (err) {
    console.error("Failed to fetch data:", err.message);
  }
});

app.post("/add", async (req, res) => {
  const { title, date, rating, summary, notes } = req.body;
  const isbn = API_URL +  req.body.isbn + "-L.jpg";

  try {
    await db.query("INSERT INTO books (title, date, rating, summary, notes, cover_url) VALUES ($1, $2, $3, $4, $5, $6)", [title, date, rating, summary, notes, isbn]);
    res.redirect("/");
  } catch (err) {
    console.error('Error inserting data:', err);
    res.status(500).send('Error inserting data');
  }
});

app.post("/editItems", async (req, res) => {
  const { updatedItemTitle, updatedItemDate, updatedItemRating, updatedItemSummary, updatedItemId, updatedItemISBN } = req.body;
  
  let isbn;
  if (updatedItemISBN) {
    isbn = API_URL + updatedItemISBN + "-L.jpg";  
  } else {
    // Retrieve current cover_url from the database
    const result = await db.query("SELECT cover_url FROM books WHERE id = $1", [updatedItemId]);
    isbn = result.rows[0].cover_url;
  }

  try {
    await db.query("UPDATE books SET title = $1, date = $2, rating = $3, summary = $4, cover_url = $5 WHERE id = $6", 
                   [updatedItemTitle, updatedItemDate, updatedItemRating, updatedItemSummary, isbn, updatedItemId]);
    res.redirect("/");
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).send("Server Error");
  }
});

app.post("/editNotes", async (req, res) => {
  const { updatedItemnotes, updatedItemId } = req.body;
  try {
    await db.query("UPDATE books SET notes = $1 WHERE id = $2", [updatedItemnotes, updatedItemId]);
    res.redirect(`/notes?notesId=${updatedItemId}`);
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).send("Server Error");
  }
});

app.post("/delete", async (req, res) => {
  const { deleteItemId } = req.body;
  try {
    await db.query("DELETE FROM books WHERE id = $1", [deleteItemId]);
    res.redirect("/");
  } catch (err) {
    console.error("Server error:", err);
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

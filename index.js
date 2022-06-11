import { createRequire } from "module";
const require = createRequire(import.meta.url);

import express from "express";
import morgan from "morgan";
import helmet from "helmet";
import yup from "yup";
import monk from "monk";
import path from 'path'
import { nanoid } from "nanoid";
import {fileURLToPath} from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
require("dotenv").config();
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
// const express = require("express")
// const morgan = require("morgan");
// const helmet = require("helmet");
// const yup = require("yup");
// const monk = require("monk");
// const nanoid = require('nanoid')

const db = monk(process.env.MONGO_URI);
const urls = db.get("urls");
urls.createIndex({ slug: 1 }, { unique: true });
const app = express();
app.enable('trust proxy');
const port = 3500;
app.use(helmet());
app.use(morgan("common"));
app.use(express.json());
app.use(express.static("public"));
const notFoundPath = path.join(__dirname, 'public/404.html');

const schema = yup.object().shape({
  slug: yup
    .string()
    .trim()
    .matches(/^[\w\-]+$/i),
  url: yup.string().trim().url().required(),
});

// app.get('/:id',(req,res)=>{
//     //  get a url
// })

// app.post('/url',(req,res)=>{
//     //  create short url
// })

// app.get('/url:id',(req,res)=>{
//     //  retireve to url
// })
app.get('/:id', async (req, res, next) => {
  const { id: slug } = req.params;
  try {
    const url = await urls.findOne({ slug });
    if (url) {
      return res.redirect(url.url);
    }
    return res.status(404).sendFile(notFoundPath);
  } catch (error) {
    return res.status(404).sendFile(notFoundPath);
  }
});
app.post(
  "/url",
  slowDown({
    windowMs: 30 * 1000,
    delayAfter: 1,
    delayMs: 500,
  }),
  rateLimit({
    windowMs: 30 * 1000,
    max: 1,
  }),
  async (req, res, next) => {
    let { slug, url } = req.body;
    try {
      await schema.validate({
        slug,
        url,
      });
      if (url.includes("cdg.sh")) {
        throw new Error("Stop it");
      }
      if (!slug) {
        slug = nanoid(5);
      } else {
        const existing = await urls.findOne({ slug });
        if (existing) {
          throw new Error("slug in use");
        }
      }
      slug = slug.toLowerCase();

      const newUrl = {
        url,
        slug,
      };
      const created = await urls.insert(newUrl);
      res.json(created);
      // res.json({
      //   slug,
      //   url
      // })
    } catch (error) {
      // if(error.message.startsWith('E11000')){
      //   error.message = 'slug in use'
      // }
      next(error);
    }
  }
);

app.use((error, req, res, next) => {
  if (error.status) {
    res.status(error.status);
  } else {
    res.status(500);
  }
  res.json({
    message: error.message,
    stack: process.env.NODE_ENV === "production" ? "🙄" : error.stack,
  });
});

app.listen(port, () => {
  console.log(`listening at the : https://localhost:${port}`);
});

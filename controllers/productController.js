var Product = require('../models/product');
var Component = require('../models/component')
var async = require('async');
var mongoose = require('mongoose')
var multer = require('multer')
const fs = require('fs');
const { body, validationResult } = require("express-validator/");

exports.homepage = function(req, res, next) {
    Component.find()
    .exec(function (err, list_components) {
        if (err) { return next(err); }
        res.render('homepage', { title: 'System Builder', component_list: list_components });
    });
};

// Display list of all products.
exports.product_list = function(req, res) {
    res.send('NOT IMPLEMENTED: Product list');
};

// Display detail page for a specific product.
exports.product_detail = function (req, res, next) {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      let err = new Error("Invalid ObjectID");
      err.status = 404;
      return next(err);
    }
    Product.findById(req.params.id)
      .populate("component")
      .exec(function (err, product) {
        if (err) next(err);
  
        if (product == null) {
          let err = new Error(
            "Product not found. It may have been deleted, or does not exist."
          );
          err.status = 404;
          return next(err);
        }
  
        res.render("product_detail", {
          title: product.name,
          product: product,
          component: product.component,
          features: product.technicalInformation.split(','),
          price: product.price.toString()
        });
      });
  };
  

// Display product create form on GET.
exports.product_create_get = function(req, res) {
    res.send('NOT IMPLEMENTED: Product create GET');
};

// Handle product create on POST.
exports.product_create_post = function(req, res) {
    res.send('NOT IMPLEMENTED: Product create POST');
};

// Display product delete form on GET.
exports.product_delete_get = function (req, res, next) {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    let err = new Error("Invalid ObjectID");
    err.status = 404;
    return next(err);
  }
  Product.findById(req.params.id)
    .populate("component")
    .exec(function (err, product) {
      if (err) next(err);

      if (product == null) {
        let err = new Error(
          "Product not found. It may have been deleted, or does not exist."
        );
        err.status = 404;
        return next(err);
      }

      res.render("product_delete", {
        title: "Delete product: " + product.name,
        product: product,
        component: product.component,
      });
    });
};

// Handle product delete on POST.
exports.product_delete_post = function (req, res, next) {
    Product.findByIdAndRemove(req.body.productid, function deleteProduct(err) {
      if (err) return next(err);
      res.redirect("/list");
    });
};

// Display product update form on GET.
exports.product_update_get = function (req, res, next) {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    let err = new Error("Invalid ObjectID");
    err.status = 404;
    return next(err);
  }
  async.parallel(
    {
      product: function (callback) {
        Product.findById(req.params.id)
          .populate("component")
          .exec(callback);
      },
      components: function (callback) {
        Component.find().exec(callback);
      },
    },
    function (err, results) {
      if (err) return next(err);

      if (results.product == null) {
        let err = new Error(
          "Product not found. It may have been deleted, or does not exist."
        );
        err.status = 404;
        return next(err);
      }

      res.render("product_update_form", {
        title: "Update Product",
        product: results.product,
        components: results.components,
      });
    }
  );
};

// Handle product update on POST.
exports.product_update_post = [

  // Validate and sanitise fields.
  body("name", "Name must be at least 3 characters in length")
    .trim()
    .isLength({ min: 3 })
    .escape(),
  body("price", "Price must be between $0 and $999999").trim().escape(),
  body("technicalInformation", "Must be present"),
  body("stock", "Stock cannot be lower than 0"),
  body("component", "Component must not be empty").trim().escape(),

  // Process request after validation and sanitization.
  (req, res, next) => {
    
    // Extract the validation errors from a request.
    const errors = validationResult(req);

    // Create a Product object with escaped/trimmed data and old id.
    const product = new Product({
      name: req.body.name,
      technicalInformation: req.body.technicalInformation,
      stock: req.body.stock,
      price: req.body.price,
      component: req.body.component,
      _id: req.params.id,
    });

    if (req.file && errors.isEmpty()) {
      console.log('FILE', req.file)
      product.img = req.file.filename;
      fs.unlink(`public/images/${req.body.fileName}`, (err) => {
        if (err) console.log(err);
        console.log(req.body.fileName, "was deleted");
      });
    } else if(req.body.fileName && req.body.fileName !='null' && req.body.fileName !='undefined'){
      product.img = req.body.fileName;
    }

    if (!errors.isEmpty()) {
  

      async.parallel(
        {
          components: function (callback) {
            Component.find().exec(callback);
          },
        },
        function (err, results) {
          if (err) return next(err);
          res.render('product_update_form', {
            title: "Update Product",
            product: product,
            components: results.components,
            errors: errors.array(),
          });
        }
      );
      return;
    } else {
      Product.findByIdAndUpdate(
        req.params.id,
        product,
        {},
        function (err, theproduct) {
          if (err) { return next(err); }
          if (theproduct) {
            res.redirect(theproduct.url);
          }
        }
      );
    }
  }
];
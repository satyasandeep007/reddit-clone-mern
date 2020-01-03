const User = require('../models/User');
const Post = require('../models/Post');
const jwt = require('jsonwebtoken');
const config = require('../config');
const helpers = require('../helpers/helpers');
const userController = {};

userController.validateRegInfo = (req, res, next) => {
  let response = {};
  let { username, password, passwordConfirm, email } = req.body;
  if (username && password && passwordConfirm && email) {
    req.sanitizeBody('username');
    req.checkBody('username', 'Username should not be empty!').notEmpty();
    req.sanitizeBody('email');
    req.checkBody('email', 'Email should not be empty').notEmpty();
    req
      .checkBody('email', 'You must enter a valid email to register')
      .isEmail();
    req.checkBody('password', 'Password should not be empty').notEmpty();
    req
      .checkBody('passwordConfirm', 'Password confirmation should not be empty')
      .notEmpty();
    req
      .checkBody('passwordConfirm', 'Both passwords does not match!')
      .equals(req.body.password);

    let errors = req.validationErrors();
    if (errors) {
      response.message = 'Please fix validation errors';
      res.json(response);
    } else {
      next();
    }
  } else {
    response.message = 'Required fields are missing';
    res.json(response);
  }
};

userController.validateLoginInfo = (req, res, next) => {
  let response = {};
  let { username, password } = req.body;
  username =
    typeof username == 'string' && username.length > 0 ? username : false;
  password =
    typeof password == 'string' && password.length > 0 ? password : false;

  if (username && password) {
    next();
  } else {
    response.message = 'Required fields are missing';
    res.json(response);
  }
};

userController.checkIfUserExists = (req, res, next) => {};

let issueNewToken = (username, _id) => {
  username = typeof username == 'string' && username.length > 0;
  _id = typeof _id == 'string';
  if (username && _id) {
    return jwt.sign({ username, _id }, config.secret, { expiresIn: '1h' });
  } else {
    return undefined;
  }
};

userController.register = async (req, res) => {
  let response = {};
  let { username, password, email } = req.body;
  try {
    // Check if the username is taken
    let existingUser = await User.findOne({ username });

    if (existingUser) {
      response.message = 'The username is already taken';
      res.json(response);
      return;
    } else {
      let salt = helpers.generateSalt();
      let hash = helpers.hashThePassword(password, salt);

      req.body.password = undefined;
      req.body.passwordConfirm = undefined;

      let user = new User(req.body);
      user.salt = salt;
      user.hash = hash;

      await user.save();
      // Create a new token for the user
      response.token = jwt.sign(
        { username: user.username, _id: user._id },
        config.secret,
        {
          expiresIn: '1d'
        }
      );

      response.user = helpers.stripTheUserData(user);
      response.success = true;
      res.json(response);
    }
  } catch (error) {
    response.message = 'Something went wrong in the server';
    res.json(response);
  }
};

// POST login controller
userController.login = async (req, res) => {
  let response = {};
  try {
    let { username, password } = req.body;
    // Check if the user exists
    let user = await User.findOne({ username });
    if (user && user.hash && user.salt) {
      // TODO
      // Check if the password matches..
      let hashedPassword = helpers.hashThePassword(password, user.salt);

      if (hashedPassword == user.hash) {
        // Delete the password/hash info then send it
        // Create a new token for the user
        response.token = jwt.sign(
          { username: user.username, _id: user._id },
          config.secret,
          {
            expiresIn: '1d'
          }
        );

        response.user = helpers.stripTheUserData(user);
        response.success = true;
        res.json(response);
      } else {
        response.message = 'Username or password does not match!';
        res.json(response);
      }
    } else {
      response.message = 'There is no user with that username';
      res.json(response);
    }
  } catch (error) {
    res.message = `The server got an error while trying to check the username`;
    res.json(response);
  }
};

userController.adminAction = async (req, res) => {
  let response = {};
  try {
    // Check if the authorized user is actually an admin
    let { userId } = req.body;
    let { username, action } = req.params;
    let adminUser = await User.findById(userId);

    if (adminUser && adminUser.isAdmin) {
      // Continue performing the action
      // Find the user to perform the action
      let theUser = await User.findOne({ username });
      if (theUser) {
        let updatedUser;
        switch (action) {
          // Possible actions:
          // BAN, UNBAN, MAKEADMIN, REMOVEADMIN
          case 'ban':
            updatedUser = await User.findByIdAndUpdate(
              theUser._id,
              { banned: true, isAdmin: false },
              { new: true }
            );
            break;
          case 'unban':
            updatedUser = await User.findByIdAndUpdate(
              theUser._id,
              { banned: false },
              { new: true }
            );
            break;
          case 'makeadmin':
            updatedUser = await User.findByIdAndUpdate(
              theUser._id,
              { isAdmin: true, banned: false },
              { new: true }
            );
            break;
          case 'removeadmin':
            updatedUser = await User.findByIdAndUpdate(
              theUser._id,
              { isAdmin: false },
              { new: true }
            );
            break;
          default:
            return null;
        }
        response.success = true;
        response.currentUser = helpers.stripTheUserData(updatedUser);
        response.message = `Successfully performed the action ${
          req.params.action
        } on the user ${req.params.username}`;
        res.json(response);
      } else {
        // The user was not found or he/she is already an admin;
        response.message = 'The given user does not exists';
        res.json(response);
      }
    } else {
      response.message = 'You are not authorize to do that.';
      res.json(response);
    }
  } catch (error) {
    response.message = `There was an error performing this action ${error}`;
    res.json(response);
  }
};

// Delete a user and all the posts created by him/her/it
userController.deleteUser = async (req, res) => {
  let response = {};
  try {
    let { userId } = req.body;
    let { username } = req.params;
    // Check if the auth user is really an admin
    let adminUser = await User.findById(userId);
    if (adminUser && adminUser.isAdmin) {
      // Now check if the user to be deleted actually exists or not
      let usertoDelete = await User.findOne({ username });
      if (usertoDelete) {
        // Now delete all the posts created by that user
        await Post.deleteMany({ author: usertoDelete._id });
        // Now finally delete that user
        await User.deleteOne({ _id: usertoDelete._id });
        response.success = true;
        response.message = `Successfully deleted the user ${username} and any posts created by them.`;
        res.json(response);
      } else {
        response.message = `The given user was not found or is already deleted.`;
        res.json(response);
      }
    } else {
      response.message = `You are not authorized to perform this action`;
      res.json(response);
    }
  } catch (error) {
    response.message = `There was an error deleting this user, see error: ${error}`;
    res.json(response);
  }
};

module.exports = userController;

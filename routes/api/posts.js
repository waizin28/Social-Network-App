const express = require('express');
const router = express.Router();
const Post = require('../../models/Post');
const User = require('../../models/User');
const auth = require('../../middleware/auth');
const { check, validationResult } = require('express-validator');
const { post } = require('request');
const { error } = require('console');

// @route  POST api/posts
// @desc   Create Post
// @access Private
router.post(
  '/',
  [auth, [check('text', 'Text is required').not().isEmpty()]],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    try {
      const user = await User.findById(req.user.id).select('-password');

      const newPost = new Post({
        text: req.body.text,
        name: user.name,
        avatar: user.avatar,
        user: req.user.id,
      });

      const post = await newPost.save();
      res.json(post);
    } catch (err) {
      console.log(err.message);
      res.status(500).send('Server Error');
    }
  }
);

// @route  GET api/posts
// @desc   GET all posts
// @access Private
router.get('/', auth, async (req, res) => {
  try {
    // Most recent
    const posts = await Post.find().sort({ date: -1 });
    res.json(posts);
  } catch (err) {
    console.log(err.meesage);
    res.status(500).send('Server Error');
  }
});

// @route  GET api/posts/:id
// @desc   GET post by ID
// @access Private
router.get('/:id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) return res.status(404).json({ msg: 'Post not found' });

    res.json(post);
  } catch (err) {
    console.log(err.meesage);

    // For invalid id
    if (err.kind === 'ObjectId')
      return res.status(404).json({ msg: 'Post not found' });

    res.status(500).send('Server Error');
  }
});

// @route  DELETE api/posts/:id
// @desc   DELETE a post by id
// @access Private
router.delete('/:id', auth, async (req, res) => {
  try {
    // Most recent
    const post = await Post.findById(req.params.id);

    // Post doesn't exist
    if (!post) return res.status(404).json({ msg: 'Post not found' });

    // Make sure the post trying to deleted is created by the user
    // Check the id of the post owner vs the id of the use that is logged in
    if (post.user.toString() !== req.user.id)
      return res.status(401).json({ msg: 'User not authorize' });

    await post.deleteOne();

    res.json({ msg: 'Post removed' });
  } catch (err) {
    console.log(err.meesage);

    // For invalid id
    if (err.kind === 'ObjectId')
      return res.status(404).json({ msg: 'Post not found' });

    res.status(500).send('Server Error');
  }
});

// @route  PUT api/posts/like:id
// @desc   Like a post
// @access Private
router.put('/like/:id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    // Check if post has already been liked by user
    if (
      post.likes.filter((like) => like.user.toString() === req.user.id).length >
      0
    )
      return res.status(400).json({ msg: 'Post already liked' });

    post.likes.unshift({ user: req.user.id });

    await post.save();

    res.json(post.likes);
  } catch (err) {
    console.log(err.meesage);
    res.status(500).send('Server Error');
  }
});

// @route  PUT api/posts/unlike:id
// @desc   Unlike a post
// @access Private
router.put('/unlike/:id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    // Check if post has already been liked by user
    if (
      post.likes.filter((like) => like.user.toString() === req.user.id)
        .length === 0
    )
      return res.status(400).json({ msg: 'Post has not yet been liked' });

    //   Get remove index -> in this case likes have array of users that have liked this so it will remove that user from list if unlike
    const removeIndex = post.likes
      .map((like) => like.user.toString())
      .indexOf(req.user.id);

    post.likes.splice(removeIndex, 1);

    await post.save();

    // Send back after unliking the post
    res.json(post.likes);
  } catch (err) {
    console.log(err.meesage);
    res.status(500).send('Server Error');
  }
});

// @route  POST api/posts/comment:id
// @desc   Comment on post (need to pass in post id)
// @access Private
router.post(
  '/comment/:id',
  [auth, check('text', 'Text is required').not().isEmpty()],
  async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty())
      return res.status(400).json({ errors: error.array() });

    try {
      const user = await User.findById(req.user.id).select('-password');

      const post = await Post.findById(req.params.id);

      const newComment = {
        text: req.body.text,
        name: user.name,
        avatar: user.avatar,
        user: req.user.id,
      };

      post.comments.unshift(newComment);

      await post.save();

      res.json(post.comments);
    } catch (err) {
      console.log(err.meesage);
      res.status(500).send('Server Error');
    }
  }
);

// @route  DELETE api/posts/comment/:id/:comment_id
// @desc   DELETE comment on post (need both post id and comment id)
// @access Private
router.delete('/comment/:id/:comment_id', auth, async (req, res) => {
  try {
    // Get the post by the id
    const post = await Post.findById(req.params.id);

    // Get the comment from the post
    const comment = post.comments.find(
      (comment) => comment.id === req.params.comment_id
    );

    // Make sure comment exist
    if (!comment) return res.status(404).json({ msg: 'Comment is not found' });

    // Make sure the user deleting the comment is the one that make the comment
    if (comment.user.toString() !== req.user.id)
      return res.status(401).json({ msg: 'User is not authorized' });

    // Procced to remove
    const removeIndex = post.comments
      .map((comment) => comment.user.toString())
      .indexOf(req.user.id);

    post.comments.splice(removeIndex, 1);

    await post.save();

    res.json(post.comments);
  } catch (err) {
    console.log(err.meesage);
    res.status(500).send('Server Error');
  }
});

module.exports = router;

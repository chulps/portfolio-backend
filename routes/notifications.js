const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const User = require("../models/User");

// Get notifications for the authenticated user
// Get notifications and friend requests for the authenticated user
router.get("/", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select("notifications friendRequests")
      .populate("friendRequests.sender", "username email profileImage");

    const notifications = user.notifications || [];
    const friendRequests = user.friendRequests || [];

    res.json({ notifications, friendRequests });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).send("Server Error");
  }
});

module.exports = router;

// Mark notifications as read for the authenticated user
router.post("/mark-read", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    user.notifications.forEach((notification) => {
      notification.read = true;
    });
    await user.save();
    res.status(200).json({ message: "Notifications marked as read" });
  } catch (error) {
    console.error("Error marking notifications as read:", error);
    res.status(500).send("Server Error");
  }
});

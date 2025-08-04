router.post("/assign-role", authMiddleware, async (req, res) => {
  const { userId, roleId } = req.body;
  const user = await User.findById(userId);
  if (!user) return res.status(404).send("User not found");

  user.roles.push(roleId);
  await user.save();
  res.send("Role assigned successfully");
});

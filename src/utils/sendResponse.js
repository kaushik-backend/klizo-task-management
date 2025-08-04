const setSuccessResponse = (res, code = "", success = "", data = null, message = "") => {
  return res.status(code).json({
    code,
    success,
    message,
    data,
  });
};

module.exports = {
  setSuccessResponse,
};

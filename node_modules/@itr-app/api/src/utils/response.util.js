export const success = (res, data, message = "Success", statusCode = 200) => {
  return res.status(statusCode).json({ success: true, data, message });
};

export const error = (res, message = "Something went wrong", statusCode = 500, code = "INTERNAL_ERROR") => {
  return res.status(statusCode).json({ success: false, error: message, code });
};

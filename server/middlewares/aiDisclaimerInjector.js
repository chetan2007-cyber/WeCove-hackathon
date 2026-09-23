const injectAiDisclaimer = (req, res, next) => {
  const originalJson = res.json;
  
  res.json = function (data) {
    if (data && typeof data === 'object' && !data.disclaimer) {
      // Append the mandatory disclaimer to any AI observation payload
      data.disclaimer = "AI SUGGESTION: This report summarizes digital activity and does not constitute a medical diagnosis.";
    }
    originalJson.call(this, data);
  };
  
  next();
};

module.exports = injectAiDisclaimer;
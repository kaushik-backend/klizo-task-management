// utils/dateValidation.js
const moment = require('moment'); 

function validateDates(startDate, endDate) {
  // Parse the dates 
  const start = moment(startDate);
  const end = moment(endDate);

  // Check if start is after end
  if (start.isAfter(end)) {
    return 'Start date cannot be greater than end date';
  }

  // Check if both dates are on the same day but start is after end
  if (start.isSame(end, 'day') && start.isAfter(end)) {
    return 'Start date cannot be later than end date on the same day';
  }

  return null; 
}

module.exports = { validateDates };

const getPaginatedData = async (
  model,
  page = 1,
  pageSize = 10,
  filter = {},
  fields = {}
) => {
  if (page === 0) {
    return { count: 0, totalPages: 0, currentPage: page, data: [] };
  }

  // Get the total number of documents matching the filter
  const countDocs = await model.countDocuments(filter);

  const count = countDocs;
  if (count === 0) {
    return { count, totalPages: 0, currentPage: page, data: [] };
  }

  // Calculate total pages and handle pagination
  const totalPages = Math.ceil(count / pageSize);
  const currentPage = Number(page);
  const offset = (currentPage - 1) * pageSize;

  // Build the aggregation pipeline with filter, pagination, and fields
  const pipeline = [
    { $match: filter }, // Apply the filter
    { $skip: offset },  // Skip the documents for pagination
    { $limit: pageSize }, // Limit the number of documents per page
    { $project: fields }, // Project only the desired fields
  ];

  // Fetch the paginated data
  const data = await model.aggregate(pipeline).exec();

  return { count, totalPages, currentPage, data };
};

module.exports={getPaginatedData};
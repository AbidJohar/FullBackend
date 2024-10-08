const asyncHandler = (reqHandler) => {
    return (req, res, next) => {
        Promise
        .resolve(reqHandler(req, res, next))
        .catch((err) => next(err)); // Pass the error to the next middleware
    };
};

export { asyncHandler };


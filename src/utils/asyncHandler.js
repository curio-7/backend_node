// const asyncHandler = () => {}
// const asyncHandler = (fn) => async () => {} High order Functions
// const asyncHandler = (fn) => ( async ()=> {} )

// const asyncHandler = (fn) => async (req,res,next) => {
//     try {
//         await fn(req,res,next)

//     } catch (error) {
//         res.status(err.code || 500),json({
//             success  :false,
//             message: err.message
//         })
//     }
// }
//This above code can be written same as below but wuth a production touch

const asyncHandler = (requestHandler) => {
    return (req,res,next) => {
        Promise.resolve(requestHandler(req,res,next))
        .catch((err) => next(err))
    }
}





export { asyncHandler }
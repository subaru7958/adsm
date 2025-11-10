class ErrorHandler extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
    }
}
export const errorMiddleware=(err,req,res,next)=>{
    // Log the full error for debugging
    console.error("Error caught by middleware:", err);
    
    err.statusCode=err.statusCode || 500;
    err.message=err.message || "Internal Server Error";
    
    if(err.name==="CastError"){
        const message=`Resource not found. Invalid: ${err.path}`;
        err=new ErrorHandler(message,400);
    }
     if(err.name==="JsonwebTokenError"){
        const message=`Json Web Token is invalid , Try again! : ${err.path}`;
        err=new ErrorHandler(message,400);
    }
     if(err.name==="TokenExpiredError"){
        const message=`Json Web Token is expired , Try again! : ${err.path}`;
        err=new Error(message,400);
    }
    if(err.code===11000){
        const message=`Duplicate : ${Object.keys(err.keyValue)}`;
        err=new ErrorHandler(message,400);
    }
    return res.status(err.statusCode).json({
        success:false,
        message:err.message,
    });

};
export default errorMiddleware;
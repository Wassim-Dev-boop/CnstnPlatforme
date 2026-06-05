package com.cnstn.event.exception;

import jakarta.servlet.http.HttpServletRequest;
import java.net.URI;
import java.util.Objects;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.NoHandlerFoundException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ResourceNotFoundException.class)
    public ProblemDetail handleNotFound(ResourceNotFoundException ex, HttpServletRequest request) {
        return buildProblem(HttpStatus.NOT_FOUND, ex.getMessage(), requestUri(request));
    }

    @ExceptionHandler(BadRequestException.class)
    public ProblemDetail handleBadRequest(BadRequestException ex, HttpServletRequest request) {
        return buildProblem(HttpStatus.BAD_REQUEST, ex.getMessage(), requestUri(request));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ProblemDetail handleValidation(MethodArgumentNotValidException ex, HttpServletRequest request) {
        return buildProblem(HttpStatus.BAD_REQUEST, ex.getMessage(), requestUri(request));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ProblemDetail handleAccessDenied(AccessDeniedException ex, HttpServletRequest request) {
        return buildProblem(HttpStatus.FORBIDDEN, "Access denied", requestUri(request));
    }

    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    public ProblemDetail handleUnsupportedMediaType(HttpMediaTypeNotSupportedException ex, HttpServletRequest request) {
        return buildProblem(HttpStatus.UNSUPPORTED_MEDIA_TYPE, ex.getMessage(), requestUri(request));
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ProblemDetail handleMissingParam(MissingServletRequestParameterException ex, HttpServletRequest request) {
        return buildProblem(HttpStatus.BAD_REQUEST, ex.getMessage(), requestUri(request));
    }

    @ExceptionHandler(NoHandlerFoundException.class)
    public ProblemDetail handleNoHandler(NoHandlerFoundException ex, HttpServletRequest request) {
        return buildProblem(HttpStatus.NOT_FOUND, "No handler for " + ex.getHttpMethod() + " " + ex.getRequestURL(), requestUri(request));
    }

    @ExceptionHandler(Exception.class)
    public ProblemDetail handleGeneric(Exception ex, HttpServletRequest request) {
        log.error("Unhandled exception for request {}", requestUri(request), ex);
        return buildProblem(HttpStatus.INTERNAL_SERVER_ERROR, "Unexpected server error", requestUri(request));
    }

    private ProblemDetail buildProblem(HttpStatus status, String detail, String instancePath) {
        ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(HttpStatusCode.valueOf(status.value()), detail);
        problemDetail.setTitle(status.getReasonPhrase());
        problemDetail.setType(Objects.requireNonNull(URI.create("about:blank")));
        problemDetail.setInstance(Objects.requireNonNull(URI.create(Objects.requireNonNull(instancePath))));
        return problemDetail;
    }

    private static String requestUri(HttpServletRequest request) {
        return Objects.requireNonNull(request.getRequestURI());
    }
}

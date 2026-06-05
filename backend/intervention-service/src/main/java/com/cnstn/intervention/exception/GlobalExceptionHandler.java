package com.cnstn.intervention.exception;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import java.net.URI;
import java.util.Objects;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.http.converter.HttpMessageNotReadableException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ResourceNotFoundException.class)
    public ProblemDetail handleNotFound(ResourceNotFoundException ex, HttpServletRequest request) {
        return buildProblem(HttpStatus.NOT_FOUND, ex.getMessage(), requestUri(request));
    }

    @ExceptionHandler(ConflictException.class)
    public ProblemDetail handleConflict(ConflictException ex, HttpServletRequest request) {
        return buildProblem(HttpStatus.CONFLICT, ex.getMessage(), requestUri(request));
    }

    @ExceptionHandler(BadRequestException.class)
    public ProblemDetail handleBadRequest(BadRequestException ex, HttpServletRequest request) {
        return buildProblem(HttpStatus.BAD_REQUEST, ex.getMessage(), requestUri(request));
    }

    @ExceptionHandler({MethodArgumentNotValidException.class, ConstraintViolationException.class})
    public ProblemDetail handleValidation(Exception ex, HttpServletRequest request) {
        String detail;
        if (ex instanceof MethodArgumentNotValidException methodEx) {
            detail = methodEx.getBindingResult()
                    .getFieldErrors()
                    .stream()
                    .map(this::formatFieldError)
                    .collect(Collectors.joining("; "));
        } else {
            detail = ex.getMessage();
        }
        return buildProblem(HttpStatus.UNPROCESSABLE_ENTITY, detail, requestUri(request));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ProblemDetail handleMalformedJson(HttpMessageNotReadableException ex, HttpServletRequest request) {
        String detail = "Malformed request payload.";
        Throwable rootCause = ex.getMostSpecificCause();
        if (rootCause != null && rootCause.getMessage() != null && rootCause.getMessage().contains("InterventionStatus")) {
            detail = "Invalid intervention status. Allowed values: REQUESTED, IN_PROGRESS, COMPLETED, VALIDATED, REJECTED.";
        }
        return buildProblem(HttpStatus.BAD_REQUEST, detail, requestUri(request));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ProblemDetail handleAccessDenied(AccessDeniedException ex, HttpServletRequest request) {
        return buildProblem(HttpStatus.FORBIDDEN, "Access denied", requestUri(request));
    }

    @ExceptionHandler(Exception.class)
    public ProblemDetail handleGeneric(Exception ex, HttpServletRequest request) {
        return buildProblem(HttpStatus.INTERNAL_SERVER_ERROR, "Unexpected server error", requestUri(request));
    }

    private String formatFieldError(FieldError fieldError) {
        return fieldError.getField() + " " + fieldError.getDefaultMessage();
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

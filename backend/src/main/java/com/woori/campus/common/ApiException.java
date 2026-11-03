package com.woori.campus.common;

import org.springframework.http.HttpStatus;

/** 사용자에게 보여줄 메시지와 HTTP 상태를 함께 들고 다니는 예외. */
public class ApiException extends RuntimeException {

    private static final long serialVersionUID = 1L;

    private final HttpStatus status;

    public ApiException(HttpStatus status, String message) {
        super(message);
        this.status = status;
    }

    public HttpStatus getStatus() {
        return status;
    }
}

package com.woori.campus.auth;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * 컨트롤러 파라미터에 붙이면 "Authorization: Bearer 토큰"으로 요청한 플레이어를 넣어 준다.
 * 토큰이 없거나 틀리면 401.
 */
@Target(ElementType.PARAMETER)
@Retention(RetentionPolicy.RUNTIME)
public @interface CurrentPlayer {
}

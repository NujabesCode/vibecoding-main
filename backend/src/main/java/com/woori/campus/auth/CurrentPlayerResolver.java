package com.woori.campus.auth;

import com.woori.campus.common.ApiException;
import com.woori.campus.player.Player;
import com.woori.campus.player.PlayerRepository;
import java.util.Optional;
import org.springframework.core.MethodParameter;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

@Component
public class CurrentPlayerResolver implements HandlerMethodArgumentResolver {

    private final PlayerRepository players;

    public CurrentPlayerResolver(PlayerRepository players) {
        this.players = players;
    }

    @Override
    public boolean supportsParameter(MethodParameter parameter) {
        return parameter.hasParameterAnnotation(CurrentPlayer.class)
                && Player.class.isAssignableFrom(parameter.getParameterType());
    }

    @Override
    public Object resolveArgument(MethodParameter parameter, ModelAndViewContainer mav,
                                  NativeWebRequest request, WebDataBinderFactory binderFactory) {
        return findByAuthorization(request.getHeader("Authorization"))
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "다시 입장해 주세요"));
    }

    public Optional<Player> findByAuthorization(String header) {
        if (header == null || !header.startsWith("Bearer ")) {
            return Optional.empty();
        }
        String token = header.substring("Bearer ".length()).strip();
        if (token.isEmpty() || token.length() > 64) {
            return Optional.empty();
        }
        return players.findByToken(token);
    }
}

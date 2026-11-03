package com.woori.campus.auth;

import java.util.List;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final CurrentPlayerResolver currentPlayerResolver;

    public WebConfig(CurrentPlayerResolver currentPlayerResolver) {
        this.currentPlayerResolver = currentPlayerResolver;
    }

    @Override
    public void addArgumentResolvers(List<HandlerMethodArgumentResolver> resolvers) {
        resolvers.add(currentPlayerResolver);
    }
}

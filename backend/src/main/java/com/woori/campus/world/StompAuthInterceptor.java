package com.woori.campus.world;

import com.woori.campus.auth.CurrentPlayerResolver;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessagingException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Component;

/** 연결할 때 토큰을 확인한다. 토큰이 없거나 틀리면 연결 자체를 거절. */
@Component
public class StompAuthInterceptor implements ChannelInterceptor {

    private final CurrentPlayerResolver resolver;

    public StompAuthInterceptor(CurrentPlayerResolver resolver) {
        this.resolver = resolver;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor acc = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (acc == null || acc.getCommand() == null) {
            return message;
        }
        if (StompCommand.CONNECT.equals(acc.getCommand())) {
            var player = resolver.findByAuthorization(acc.getFirstNativeHeader("Authorization"))
                    .orElseThrow(() -> new MessagingException("다시 입장해 주세요"));
            acc.setUser(new PlayerPrincipal(player.getId(), player.getNickname()));
        } else if ((StompCommand.SEND.equals(acc.getCommand()) || StompCommand.SUBSCRIBE.equals(acc.getCommand()))
                && !(acc.getUser() instanceof PlayerPrincipal)) {
            throw new MessagingException("다시 입장해 주세요");
        }
        return message;
    }
}

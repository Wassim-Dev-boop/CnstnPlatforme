package com.cnstn.notification.security;

import java.util.Collection;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.stereotype.Component;
import org.springframework.lang.NonNull;

@Component
public class JwtAuthConverter implements Converter<Jwt, AbstractAuthenticationToken> {

    private final JwtGrantedAuthoritiesConverter defaultConverter = new JwtGrantedAuthoritiesConverter();

    @Override
    public AbstractAuthenticationToken convert(@NonNull Jwt jwt) {
        Collection<GrantedAuthority> converted = defaultConverter.convert(jwt);
        Collection<GrantedAuthority> authorities = converted == null ? new HashSet<>() : new HashSet<>(converted);

        Object claim = jwt.getClaim("realm_access");
        if (claim instanceof Map<?, ?> realmAccess) {
            Object rolesObject = realmAccess.get("roles");
            if (rolesObject instanceof Collection<?> roles) {
                Set<GrantedAuthority> roleAuthorities = roles.stream()
                        .filter(String.class::isInstance)
                        .map(String.class::cast)
                        .map(role -> "ROLE_" + role)
                        .map(SimpleGrantedAuthority::new)
                        .collect(Collectors.toSet());
                authorities.addAll(roleAuthorities);
            }
        }

        String principal = jwt.getClaimAsString("preferred_username");
        if (principal == null || principal.isBlank()) {
            principal = jwt.getSubject();
        }

        return new JwtAuthenticationToken(jwt, authorities, principal);
    }
}

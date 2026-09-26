package lk.ranminihardware.pos.shared.config;

import org.springframework.beans.factory.config.BeanPostProcessor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.lang.NonNull;
import org.springframework.mail.javamail.JavaMailSenderImpl;

/**
 * Adjustments to the auto-configured mail sender.
 *
 * <p>Spring Boot builds the sender from {@code spring.mail.*}; this only fixes
 * up what it is given, so the standard properties stay the single place mail is
 * configured.
 */
@Configuration
public class MailConfig {

  /**
   * Strips whitespace from the SMTP password.
   *
   * <p>Google displays an App Password in four groups — {@code abcd efgh ijkl
   * mnop} — and the obvious thing to do is paste it exactly as shown. Sent with
   * the spaces, Gmail rejects the sign-in, and the only symptom is reset emails
   * that never arrive. No real SMTP password relies on internal whitespace, so
   * removing it costs nothing and removes the most likely setup mistake.
   *
   * <p>Static, as a {@code BeanPostProcessor} must be, so it is registered before
   * the beans it processes are created.
   */
  @Bean
  static BeanPostProcessor mailPasswordNormaliser() {
    return new BeanPostProcessor() {
      @Override
      public Object postProcessAfterInitialization(@NonNull Object bean, @NonNull String name) {
        if (bean instanceof JavaMailSenderImpl sender && sender.getPassword() != null) {
          sender.setPassword(sender.getPassword().replaceAll("\\s+", ""));
        }
        return bean;
      }
    };
  }
}

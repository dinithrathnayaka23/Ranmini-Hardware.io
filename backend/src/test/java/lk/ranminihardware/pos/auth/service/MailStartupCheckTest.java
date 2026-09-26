package lk.ranminihardware.pos.auth.service;

import static org.assertj.core.api.Assertions.assertThat;

import lk.ranminihardware.pos.shared.config.MailConfig;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.context.support.StaticApplicationContext;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;

/**
 * The startup verdict on password-reset email, and the App Password clean-up.
 *
 * <p>The verdict is the only early warning that reset emails will not arrive,
 * because the reset page itself must answer the same way whether or not mail
 * went out. These pin that each misconfiguration is named for what it is.
 */
class MailStartupCheckTest {

  @Test
  @DisplayName("no host: says email is off, and that links go to the log")
  void noHostIsOff() {
    assertThat(verdictFor(sender("", "shop@gmail.com", "secret")))
        .contains("is OFF")
        .contains("SPRING_MAIL_HOST");
  }

  @Test
  @DisplayName("no sender at all is also reported as off")
  void noSenderIsOff() {
    assertThat(verdictFor(null)).contains("is OFF");
  }

  @Test
  @DisplayName("a host without a password names the missing setting and the App Password")
  void missingPasswordIsNamed() {
    assertThat(verdictFor(sender("smtp.gmail.com", "shop@gmail.com", "")))
        .contains("NOT WORKING")
        .contains("SPRING_MAIL_PASSWORD")
        .contains("App Password");
  }

  @Test
  @DisplayName("an unreachable server is reported, not thrown")
  void unreachableServerIsReported() {
    // Port 1 on loopback: refused immediately, so the test does not wait on a timeout.
    JavaMailSenderImpl sender = sender("127.0.0.1", "shop@gmail.com", "secret");
    sender.setPort(1);

    assertThat(verdictFor(sender)).contains("NOT WORKING").contains("could not connect");
  }

  @Test
  @DisplayName("an App Password pasted with Google's spaces is sent without them")
  void appPasswordSpacesAreRemoved() throws Exception {
    JavaMailSenderImpl sender = sender("smtp.gmail.com", "shop@gmail.com", " abcd efgh ijkl mnop ");

    Object processed =
        invokeNormaliser().postProcessAfterInitialization(sender, "mailSender");

    assertThat(((JavaMailSenderImpl) processed).getPassword()).isEqualTo("abcdefghijklmnop");
  }

  private static String verdictFor(JavaMailSender sender) {
    try (StaticApplicationContext context = new StaticApplicationContext()) {
      if (sender != null) context.getBeanFactory().registerSingleton("mailSender", sender);
      ObjectProvider<JavaMailSender> provider = context.getBeanProvider(JavaMailSender.class);
      return new MailStartupCheck(provider).check();
    }
  }

  private static JavaMailSenderImpl sender(String host, String username, String password) {
    JavaMailSenderImpl sender = new JavaMailSenderImpl();
    sender.setHost(host);
    sender.setPort(587);
    sender.setUsername(username);
    sender.setPassword(password);
    sender.getJavaMailProperties().put("mail.smtp.auth", "true");
    sender.getJavaMailProperties().put("mail.smtp.connectiontimeout", "2000");
    sender.getJavaMailProperties().put("mail.smtp.timeout", "2000");
    return sender;
  }

  private static org.springframework.beans.factory.config.BeanPostProcessor invokeNormaliser()
      throws Exception {
    var method = MailConfig.class.getDeclaredMethod("mailPasswordNormaliser");
    method.setAccessible(true);
    return (org.springframework.beans.factory.config.BeanPostProcessor) method.invoke(null);
  }
}

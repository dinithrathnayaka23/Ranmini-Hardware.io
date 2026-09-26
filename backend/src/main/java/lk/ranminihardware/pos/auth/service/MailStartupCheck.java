package lk.ranminihardware.pos.auth.service;

import jakarta.mail.AuthenticationFailedException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.stereotype.Component;

/**
 * Says at startup whether password-reset email actually works.
 *
 * <p>Without this, a broken mail setup is invisible until somebody forgets
 * their password: the reset page answers "a link is on its way" either way (it
 * must, or it would reveal which addresses exist), so the first sign of trouble
 * is a locked-out owner waiting for an email that never comes.
 *
 * <p>So the service signs in to the mail server once, as soon as it is up, and
 * writes one plain sentence to the log: working, or not working and why. It
 * runs off the startup thread, so a slow or unreachable relay delays nothing,
 * and it never stops the service starting — a shop that cannot send mail can
 * still sell.
 */
@Component
public class MailStartupCheck {

  private static final Logger log = LoggerFactory.getLogger(MailStartupCheck.class);

  private final ObjectProvider<JavaMailSender> mailSender;

  public MailStartupCheck(ObjectProvider<JavaMailSender> mailSender) {
    this.mailSender = mailSender;
  }

  @EventListener(ApplicationReadyEvent.class)
  public void checkOnStartup() {
    Thread.ofVirtual().name("mail-startup-check").start(this::check);
  }

  /** Runs the check and returns the verdict it logged, for tests. */
  String check() {
    JavaMailSender sender = mailSender.getIfAvailable();

    if (!(sender instanceof JavaMailSenderImpl impl)
        || impl.getHost() == null
        || impl.getHost().isBlank()) {
      return warn(
          "Password-reset email is OFF: SPRING_MAIL_HOST is not set in .env. Reset links"
              + " will be written to this log instead of being emailed.");
    }

    String account = "%s:%d".formatted(impl.getHost(), impl.getPort());

    if (isBlank(impl.getUsername()) || isBlank(impl.getPassword())) {
      return warn(
          ("Password-reset email is NOT WORKING: SPRING_MAIL_USERNAME and SPRING_MAIL_PASSWORD"
                  + " must both be set in .env to send through %s. For Gmail, the password"
                  + " is a 16-character App Password, not the account's normal password.")
              .formatted(account));
    }

    try {
      impl.testConnection();
      String verdict =
          "Password-reset email is working: signed in to %s as %s."
              .formatted(account, mask(impl.getUsername()));
      log.info(verdict);
      return verdict;
    } catch (AuthenticationFailedException ex) {
      return warn(
          ("Password-reset email is NOT WORKING: %s refused the username or password."
                  + " For Gmail, turn on 2-Step Verification and use an App Password"
                  + " (Google Account > Security > App passwords), not the normal password.")
              .formatted(account));
    } catch (Exception ex) {
      return warn(
          "Password-reset email is NOT WORKING: could not connect to %s (%s)."
              .formatted(account, rootMessage(ex)));
    }
  }

  private static String warn(String verdict) {
    log.warn(verdict);
    return verdict;
  }

  private static boolean isBlank(String value) {
    return value == null || value.isBlank();
  }

  private static String rootMessage(Throwable ex) {
    Throwable root = ex;
    while (root.getCause() != null && root.getCause() != root) root = root.getCause();
    return root.getMessage() == null ? root.getClass().getSimpleName() : root.getMessage();
  }

  /** The account in the log without the whole address — logs get copied around. */
  private static String mask(String username) {
    int at = username.indexOf('@');
    if (at <= 1) return "***";
    return username.charAt(0) + "***" + username.substring(at);
  }
}

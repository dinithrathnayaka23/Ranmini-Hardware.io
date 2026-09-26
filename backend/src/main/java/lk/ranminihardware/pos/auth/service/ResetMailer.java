package lk.ranminihardware.pos.auth.service;

import java.nio.charset.StandardCharsets;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

/**
 * Sends the password-reset email.
 *
 * <p><b>Works without a mail server.</b> The shop may not have SMTP configured
 * — it certainly does not during development — and a reset flow that cannot be
 * exercised until someone provisions a relay is a flow nobody tests. With no
 * sender configured, the link is written to the log instead and the caller is
 * told the mail did not really go out.
 *
 * <p>That fallback is deliberately loud, and deliberately not silent success:
 * an operator reading the log needs to see that a person asked for a reset and
 * did not receive one.
 */
@Service
public class ResetMailer {

  private static final Logger log = LoggerFactory.getLogger(ResetMailer.class);

  /**
   * Optional on purpose.
   *
   * <p>Spring only defines a {@link JavaMailSender} when a host is configured,
   * so injecting it directly would stop the whole service from starting on a
   * machine with no SMTP settings. An {@code ObjectProvider} lets this class ask
   * whether one exists rather than requiring it.
   */
  private final ObjectProvider<JavaMailSender> mailSender;

  private final String fromAddress;
  private final String shopName;

  public ResetMailer(
      ObjectProvider<JavaMailSender> mailSender,
      @Value("${ranmini.mail.from:}") String fromAddress,
      @Value("${ranmini.mail.shop-name:Ranmini Hardware}") String shopName) {
    this.mailSender = mailSender;
    this.fromAddress = fromAddress;
    this.shopName = shopName;
  }

  /**
   * Sends the reset link.
   *
   * @return true when a message actually left the building
   */
  public boolean sendResetLink(String toAddress, String fullName, String link, long validMinutes) {
    JavaMailSender sender = mailSender.getIfAvailable();

    if (!isUsable(sender)) {
      // The only place a reset link is ever written to the log, and only
      // because the alternative is a flow that cannot be used at all.
      log.warn(
          """

          ============================================================
           NO MAIL SERVER CONFIGURED — reset link was NOT sent to {}.

           Give it to them by hand, or set the SMTP settings in .env:

               {}

           This link expires in {} minutes.
          ============================================================
          """,
          toAddress,
          link,
          validMinutes);
      return false;
    }

    try {
      var message = sender.createMimeMessage();
      var helper = new MimeMessageHelper(message, false, StandardCharsets.UTF_8.name());

      helper.setFrom(senderAddress(sender));
      helper.setTo(toAddress);
      helper.setSubject("Reset your %s password".formatted(shopName));
      helper.setText(body(fullName, link, validMinutes), false);

      sender.send(message);
      log.info("Password reset email sent to {}", maskEmail(toAddress));
      return true;

    } catch (Exception ex) {
      // Never rethrown to the caller: whether the mail server is reachable is
      // not something the person asking for a reset should learn, and a failure
      // here must not turn into a different HTTP response than a success.
      log.error("Could not send password reset email to {}", maskEmail(toAddress), ex);
      return false;
    }
  }

  /**
   * The From address.
   *
   * <p>The configured one when there is one; otherwise the account the mail is
   * sent through. Gmail will only send as the signed-in account (or an alias
   * verified on it), so falling back to that is what makes a blank
   * RANMINI_MAIL_FROM work rather than fail.
   */
  private String senderAddress(JavaMailSender sender) {
    if (fromAddress != null && !fromAddress.isBlank()) return fromAddress.trim();
    if (sender instanceof JavaMailSenderImpl impl && impl.getUsername() != null) {
      return impl.getUsername();
    }
    return "no-reply@ranminihardware.lk";
  }

  /**
   * Whether this sender can actually reach a mail server.
   *
   * <p>Not simply a null check. Spring skips defining the sender when
   * {@code spring.mail.host} is absent, but an environment file that sets the
   * variable to an empty string makes the property <em>present and blank</em>,
   * which is enough for the auto-configuration to build a sender pointed at
   * nowhere. Every send would then fail after a five-second timeout instead of
   * falling back to the log, which is the worse of the two outcomes.
   */
  private static boolean isUsable(JavaMailSender sender) {
    if (sender == null) return false;
    if (sender instanceof JavaMailSenderImpl impl) {
      return impl.getHost() != null && !impl.getHost().isBlank();
    }
    return true;
  }

  /**
   * Plain text rather than HTML.
   *
   * <p>It renders identically everywhere, cannot be broken by a mail client's
   * CSS handling, and is far less likely to be treated as spam than a styled
   * template from an unfamiliar sender.
   */
  private String body(String fullName, String link, long validMinutes) {
    return """
        Hello %s,

        Somebody asked to reset the password for your %s account.

        Open this link to choose a new one:

        %s

        The link works once and expires in %d minutes.

        If this was not you, ignore this email — your password has not
        changed, and the link cannot be used without opening it.

        %s
        """
        .formatted(fullName, shopName, link, validMinutes, shopName);
  }

  /**
   * Logs an address without writing it out in full.
   *
   * <p>Operational logs get copied into tickets and chat; a staff member's
   * address does not need to travel with them to say that a mail was sent.
   */
  private static String maskEmail(String email) {
    int at = email.indexOf('@');
    if (at <= 1) return "***";
    return email.charAt(0) + "***" + email.substring(at);
  }
}

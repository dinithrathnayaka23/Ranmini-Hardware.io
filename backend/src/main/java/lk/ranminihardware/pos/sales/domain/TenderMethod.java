package lk.ranminihardware.pos.sales.domain;

/**
 * How the customer paid.
 *
 * Matches the frontend TenderMethod union exactly. Deliberately short: a
 * hardware shop takes cash or a card, and inventing MOBILE or CREDIT before the
 * shop asks for them would mean reporting categories nobody can explain.
 */
public enum TenderMethod {
  CASH,
  CARD
}

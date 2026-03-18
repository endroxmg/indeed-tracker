/**
 * Resolves the effective value for a field, considering overrides.
 * 
 * @param {Object} originalTicket - The original ticket data from Firestore
 * @param {Array} overrides - List of all override documents from 'mbrOverrides'
 * @param {string} field - The field name to resolve (e.g., 'totalTime', 'qaTime')
 * @returns {any} The resolved value
 */
export function resolveEffectiveValue(originalTicket, overrides = [], field) {
  const override = overrides.find(o => o.ticketId === originalTicket.id);
  
  if (override && override.fields && override.fields[field] !== undefined) {
    return {
      value: override.fields[field],
      isOverridden: true,
      originalValue: originalTicket[field],
      metadata: override.metadata
    };
  }

  return {
    value: originalTicket[field],
    isOverridden: false,
    originalValue: originalTicket[field]
  };
}

/**
 * Batches ticket data with overrides for easier consumption in charts.
 */
export function getEnhancedTicketData(tickets, overrides) {
  return tickets.map(ticket => {
    const override = overrides.find(o => o.ticketId === ticket.id);
    if (!override) return { ...ticket, _isOverridden: false };

    return {
      ...ticket,
      ...override.fields,
      _isOverridden: true,
      _originalData: ticket,
      _overrideMeta: override.metadata
    };
  });
}

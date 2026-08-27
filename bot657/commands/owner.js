const config = require("../config");

function getOwnerText() {
  return `👤 *Propriétaire du bot*\n\n• Nom : ${config.OWNER_NAME}\n• Numéro : +${config.OWNER_NUMBER}\n• Bot : ${config.BOT_NAME}`;
}

module.exports = { getOwnerText };

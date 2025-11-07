import bcrypt from 'bcryptjs';

const nom = 'Mercier';

console.log(`Mot de passe : ${nom}`);

// Hashage avec bcrypt (salt rounds: 10)
const passwordHash = await bcrypt.hash(nom, 10);

console.log(`\nHash bcrypt :`);
console.log(passwordHash);

console.log(`\n✅ Copiez ce hash pour la requête SQL`);

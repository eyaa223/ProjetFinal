import bcrypt from 'bcrypt';

const password = "12345"; // mot de passe à hasher

const run = async () => {
  const hash = await bcrypt.hash(password, 10);
  console.log("Hash généré :", hash);
};

run();

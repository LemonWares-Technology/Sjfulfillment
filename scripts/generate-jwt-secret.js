const crypto = require('crypto')

// Generate a secure JWT secret
const jwtSecret = crypto.randomBytes(64).toString('hex')

console.log('🔐 Generated JWT Secret:')
console.log(jwtSecret)
console.log('\n📋 Copy this to your environment variables as JWT_SECRET')
console.log('\n⚠️  Keep this secret secure and never commit it to version control!')

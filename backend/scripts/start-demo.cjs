require('dotenv').config({ quiet:true });
if (process.env.NODE_ENV === 'production') throw new Error('Demonstração PRO não pode iniciar em produção.');
const database = new URL(process.env.DATABASE_URL);
if (!['localhost','127.0.0.1','[::1]'].includes(database.hostname)) throw new Error('Este comando de demonstração exige banco local de desenvolvimento.');
process.env.NODE_ENV = 'development';
process.env.CONSTELLA_PRO_DEMO = 'true';
const app = require('../server');
app.listen(process.env.PORT || 3000, '0.0.0.0', () => console.log('API do Constella em modo de demonstração PRO. Nenhuma cobrança é realizada.'));

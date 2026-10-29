const { test } = require('node:test');
const assert = require('node:assert/strict');
const configure = require('../app.config');

test('distribuição exige API HTTPS pública antes de empacotar', () => {
  const previous = { mode:process.env.CONSTELLA_DISTRIBUTION, url:process.env.EXPO_PUBLIC_API_URL };
  try {
    process.env.CONSTELLA_DISTRIBUTION='1';
    for (const url of ['', 'http://api.example.invalid', 'https://localhost', 'https://127.0.0.1:3000', 'https://10.0.0.2', 'https://192.168.1.1', 'https://172.16.0.1', 'https://[::1]', 'https://host.local', 'https://user:pass@api.example.invalid', 'https://api.example.invalid?token=test']) {
      process.env.EXPO_PUBLIC_API_URL=url;
      assert.throws(()=>configure({config:{}}),/HTTPS pública/);
    }
    process.env.EXPO_PUBLIC_API_URL='https://api.example.invalid';
    assert.deepEqual(configure({config:{name:'Constella'}}),{name:'Constella'});
    process.env.CONSTELLA_DISTRIBUTION='0';
    delete process.env.EXPO_PUBLIC_API_URL;
    assert.deepEqual(configure({config:{}}),{});
  } finally {
    for(const [key,value]of [['CONSTELLA_DISTRIBUTION',previous.mode],['EXPO_PUBLIC_API_URL',previous.url]]) {
      if(value===undefined) delete process.env[key]; else process.env[key]=value;
    }
  }
});

const sinon = require("sinon");
const AWS = require("aws-sdk-mock");
const mockRequire = require("mock-require");

Object.assign(process.env, {
  LOG_LEVEL: "debug",
  HOSTNAME: "insultron.lmorchard.com",
  ACTOR_NAME: "Insultron2000",
  QUEUE_NAME: "AWS_SQS",
  STATIC_BUCKET: "AWS_STATIC",
  PUBLIC_KEY: `
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEApqSLUa9HCfcLuaPZUEJs
yC/ZQt+S8mQ92Z2bqycJlbKlTMZv4/cynwPmlalGjAGbrNjSXzHrSAf14g2BMPVz
N6vE8S3sMc0qgn7qwKZFXWyDww4r51K5yXKj4Wk7YaKrLLWt5SL5TtxDS+duj9Ex
d009zJHjHTqzl5cavmxSFFGmrIiDyNUQ3q61E+YBo6eMlH6Iex8IQOIs0WXfIjgd
50NCqUSB28W0Wix/+5qo7YMpTFi4qiQyDELe2pZsw0sTU3KVHuTn8H+Xwh94QBLX
RaLfMBOa3/+Az5yGozMPJ5u/Qw29RwQzQq+5JiCCdt2cHmncckVwtetXw90JRmsM
pwIDAQAB
-----END PUBLIC KEY-----
  `.trim(),
  PRIVATE_KEY: `
-----BEGIN RSA PRIVATE KEY-----
MIIEogIBAAKCAQEApqSLUa9HCfcLuaPZUEJsyC/ZQt+S8mQ92Z2bqycJlbKlTMZv
4/cynwPmlalGjAGbrNjSXzHrSAf14g2BMPVzN6vE8S3sMc0qgn7qwKZFXWyDww4r
51K5yXKj4Wk7YaKrLLWt5SL5TtxDS+duj9Exd009zJHjHTqzl5cavmxSFFGmrIiD
yNUQ3q61E+YBo6eMlH6Iex8IQOIs0WXfIjgd50NCqUSB28W0Wix/+5qo7YMpTFi4
qiQyDELe2pZsw0sTU3KVHuTn8H+Xwh94QBLXRaLfMBOa3/+Az5yGozMPJ5u/Qw29
RwQzQq+5JiCCdt2cHmncckVwtetXw90JRmsMpwIDAQABAoIBADudP63gK2S4OTyX
DgX1TV8sJugSfUozbCDujiLjWz1vZE0b7Ck8ZKKYTaQao38wkBV8l32wqP/iwSa2
OBJgrHAtBc5V5FpIkD2Q08BJeyUZzeU4q6IcaRRU66WW9MRP4jajY+tF4LRCfdyo
lVfjuXN5cXM+eWYaeubvCoU20QItQ4gKUFIDoJVSwyM+GRJ1JIKHZnrbDt7hyX4C
at8P9l55+mTNV7yiXFAbyzqWKWuHI3dZMkRKLIyQXYUpQtlc7cKmogvQYg04cxFy
hIkS6SBMxIXSNN0EmmULWK214YWGVf+/xY2mpWX4g0pl2LVLug1jI51b/asIuiCW
0LIx/hkCgYEA27zHxeMFjAfcPFKOijzWeMQ7xseSUGmEOVYR/V70ZKdJYQKx7pl/
Nr2uVbW7IgA4b/yFgG3zViYrzrlPHAo6pUNBsVZckIoXjJnkggtWXfREa33eQzxW
74ZKHSD84wWCucZZW3r5IKsISJD22mhPyekmGjQaoAi7qAZC2YS5+T0CgYEAwiSu
CIbTR4zlRPzFq5E/C3P5ECRT88ySWR6f982mhsmhXHM4+j+vuvBtZogdkdl3rZyw
Vk0cWsK2gPwcsptB3BQYgrT+VeAr62IsBkXGs/Zhchs+KyFa2eyyiWGOoxJBbXVk
Kp4rbPPmc5NTqU+d2L9V5T6IKbB3+DrE9voPU7MCgYAelOJ0zwi5mWp0VsURxi/P
NPhgzOu3F0hYtnrgeXOoAoQ65SYgX+qNks6NjTJTJBa2tz1ZR3QjXEKijbXN4DqT
P44IAU32q9FlNxHPa4aEovdWwnjJgL9UrKrp7OplKiIsesd67N15R3RqrQo+EWBx
aGpuISxHc4+ybdSl80vyvQKBgCItNNnZaj4xRncTjHS8d/27J8A4tPK5M5Yutvh3
onYd7qMIwaIELhpZkti244W2Y8QTTlOS9YfguSIRv7eNb1Wf0ATKee+CLBkeyiM8
i1NI7zSYKSSMlaLBcViP7P02DICJZt29xGVEtm/oIpUup9ntLODTVkMIhsYTCnNz
59jTAoGADP2J+VVFKA8kpBocJSuI4o89L3/dqVQMzkZVy4rWzLeBqFT4I3okYC8H
xGWmfFTnWAAYUvtEE10N+7JqFy2e1nqibsfMMXRGqa6nad0dNotrDGFKMyq+kqcA
Lcv6ab9uS2rZoeK7zHpfjqM9df1FRpB6hY/hT4ou+jiYpAU2DK4=
-----END RSA PRIVATE KEY-----
  `.trim(),
});

global.constants = {
  QueueUrl: "https://example.com/sqs/",
  MessageId: "abba123",
};

global.mocks = {
  fetch: sinon.stub(),
};

mockRequire("node-fetch", global.mocks.fetch);

global.resetMocks = () => {
  global.mocks.fetch.reset();
  AWS.restore();
};

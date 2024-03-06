const canvas = document.querySelector('canvas')

const devicePixelRatio = window.devicePixelRatio;
canvas.width = canvas.clientWidth * devicePixelRatio;
canvas.height = canvas.clientHeight * devicePixelRatio;

const ctx = canvas.getContext('2d');
const { width, height } = canvas;
ctx.beginPath();
ctx.arc(width / 2, height / 2, Math.min(width, height) / 2.2, 0, Math.PI * 2);
ctx.fillStyle = 'red';
ctx.fill();

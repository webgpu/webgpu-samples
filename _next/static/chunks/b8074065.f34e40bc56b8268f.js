"use strict";(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[746],{6416:function(n,t,e){let r,u,a;e.d(t,{K4:function(){return q},R3:function(){return I},_E:function(){return Z},vh:function(){return nr}});let o=Float32Array;function i(n=0,t=0){let e=new o(2);return void 0!==n&&(e[0]=n,void 0!==t&&(e[1]=t)),e}function c(n,t,e){return(e=e||new o(2))[0]=n[0]-t[0],e[1]=n[1]-t[1],e}function l(n,t,e){return(e=e||new o(2))[0]=n[0]*t,e[1]=n[1]*t,e}function f(n,t){return(t=t||new o(2))[0]=1/n[0],t[1]=1/n[1],t}function h(n,t){return n[0]*t[0]+n[1]*t[1]}function s(n){let t=n[0],e=n[1];return Math.sqrt(t*t+e*e)}function M(n){let t=n[0],e=n[1];return t*t+e*e}function w(n,t){let e=n[0]-t[0],r=n[1]-t[1];return Math.sqrt(e*e+r*r)}function d(n,t){let e=n[0]-t[0],r=n[1]-t[1];return e*e+r*r}function m(n,t){return(t=t||new o(2))[0]=n[0],t[1]=n[1],t}function v(n,t,e){return(e=e||new o(2))[0]=n[0]*t[0],e[1]=n[1]*t[1],e}function p(n,t,e){return(e=e||new o(2))[0]=n[0]/t[0],e[1]=n[1]/t[1],e}var q=Object.freeze({__proto__:null,create:i,setDefaultType:function(n){let t=o;return o=n,t},fromValues:i,set:function(n,t,e){return(e=e||new o(2))[0]=n,e[1]=t,e},ceil:function(n,t){return(t=t||new o(2))[0]=Math.ceil(n[0]),t[1]=Math.ceil(n[1]),t},floor:function(n,t){return(t=t||new o(2))[0]=Math.floor(n[0]),t[1]=Math.floor(n[1]),t},round:function(n,t){return(t=t||new o(2))[0]=Math.round(n[0]),t[1]=Math.round(n[1]),t},clamp:function(n,t=0,e=1,r){return(r=r||new o(2))[0]=Math.min(e,Math.max(t,n[0])),r[1]=Math.min(e,Math.max(t,n[1])),r},add:function(n,t,e){return(e=e||new o(2))[0]=n[0]+t[0],e[1]=n[1]+t[1],e},addScaled:function(n,t,e,r){return(r=r||new o(2))[0]=n[0]+t[0]*e,r[1]=n[1]+t[1]*e,r},angle:function(n,t){let e=n[0],r=n[1],u=n[0],a=n[1],o=Math.sqrt(e*e+r*r)*Math.sqrt(u*u+a*a),i=o&&h(n,t)/o;return Math.acos(i)},subtract:c,sub:c,equalsApproximately:function(n,t){return 1e-6>Math.abs(n[0]-t[0])&&1e-6>Math.abs(n[1]-t[1])},equals:function(n,t){return n[0]===t[0]&&n[1]===t[1]},lerp:function(n,t,e,r){return(r=r||new o(2))[0]=n[0]+e*(t[0]-n[0]),r[1]=n[1]+e*(t[1]-n[1]),r},lerpV:function(n,t,e,r){return(r=r||new o(2))[0]=n[0]+e[0]*(t[0]-n[0]),r[1]=n[1]+e[1]*(t[1]-n[1]),r},max:function(n,t,e){return(e=e||new o(2))[0]=Math.max(n[0],t[0]),e[1]=Math.max(n[1],t[1]),e},min:function(n,t,e){return(e=e||new o(2))[0]=Math.min(n[0],t[0]),e[1]=Math.min(n[1],t[1]),e},mulScalar:l,scale:l,divScalar:function(n,t,e){return(e=e||new o(2))[0]=n[0]/t,e[1]=n[1]/t,e},inverse:f,invert:f,cross:function(n,t,e){e=e||new o(3);let r=n[0]*t[1]-n[1]*t[0];return e[0]=0,e[1]=0,e[2]=r,e},dot:h,length:s,len:s,lengthSq:M,lenSq:M,distance:w,dist:w,distanceSq:d,distSq:d,normalize:function(n,t){t=t||new o(2);let e=n[0],r=n[1],u=Math.sqrt(e*e+r*r);return u>1e-5?(t[0]=e/u,t[1]=r/u):(t[0]=0,t[1]=0),t},negate:function(n,t){return(t=t||new o(2))[0]=-n[0],t[1]=-n[1],t},copy:m,clone:m,multiply:v,mul:v,divide:p,div:p,random:function(n=1,t){t=t||new o(2);let e=2*Math.random()*Math.PI;return t[0]=Math.cos(e)*n,t[1]=Math.sin(e)*n,t},zero:function(n){return(n=n||new o(2))[0]=0,n[1]=0,n},transformMat4:function(n,t,e){e=e||new o(2);let r=n[0],u=n[1];return e[0]=r*t[0]+u*t[4]+t[12],e[1]=r*t[1]+u*t[5]+t[13],e},transformMat3:function(n,t,e){e=e||new o(2);let r=n[0],u=n[1];return e[0]=t[0]*r+t[4]*u+t[8],e[1]=t[1]*r+t[5]*u+t[9],e}});Float32Array;let b=new Map([[Float32Array,()=>new Float32Array(12)],[Float64Array,()=>new Float64Array(12)],[Array,()=>Array(12).fill(0)]]);b.get(Float32Array);let x=Float32Array;function y(n,t,e){let r=new x(3);return void 0!==n&&(r[0]=n,void 0!==t&&(r[1]=t,void 0!==e&&(r[2]=e))),r}function S(n,t,e){return(e=e||new x(3))[0]=n[0]-t[0],e[1]=n[1]-t[1],e[2]=n[2]-t[2],e}function g(n,t,e){return(e=e||new x(3))[0]=n[0]*t,e[1]=n[1]*t,e[2]=n[2]*t,e}function A(n,t){return(t=t||new x(3))[0]=1/n[0],t[1]=1/n[1],t[2]=1/n[2],t}function _(n,t,e){e=e||new x(3);let r=n[2]*t[0]-n[0]*t[2],u=n[0]*t[1]-n[1]*t[0];return e[0]=n[1]*t[2]-n[2]*t[1],e[1]=r,e[2]=u,e}function F(n,t){return n[0]*t[0]+n[1]*t[1]+n[2]*t[2]}function z(n){let t=n[0],e=n[1],r=n[2];return Math.sqrt(t*t+e*e+r*r)}function T(n){let t=n[0],e=n[1],r=n[2];return t*t+e*e+r*r}function V(n,t){let e=n[0]-t[0],r=n[1]-t[1],u=n[2]-t[2];return Math.sqrt(e*e+r*r+u*u)}function k(n,t){let e=n[0]-t[0],r=n[1]-t[1],u=n[2]-t[2];return e*e+r*r+u*u}function j(n,t){t=t||new x(3);let e=n[0],r=n[1],u=n[2],a=Math.sqrt(e*e+r*r+u*u);return a>1e-5?(t[0]=e/a,t[1]=r/a,t[2]=u/a):(t[0]=0,t[1]=0,t[2]=0),t}function D(n,t){return(t=t||new x(3))[0]=n[0],t[1]=n[1],t[2]=n[2],t}function O(n,t,e){return(e=e||new x(3))[0]=n[0]*t[0],e[1]=n[1]*t[1],e[2]=n[2]*t[2],e}function E(n,t,e){return(e=e||new x(3))[0]=n[0]/t[0],e[1]=n[1]/t[1],e[2]=n[2]/t[2],e}var I=Object.freeze({__proto__:null,create:y,setDefaultType:function(n){let t=x;return x=n,t},fromValues:y,set:function(n,t,e,r){return(r=r||new x(3))[0]=n,r[1]=t,r[2]=e,r},ceil:function(n,t){return(t=t||new x(3))[0]=Math.ceil(n[0]),t[1]=Math.ceil(n[1]),t[2]=Math.ceil(n[2]),t},floor:function(n,t){return(t=t||new x(3))[0]=Math.floor(n[0]),t[1]=Math.floor(n[1]),t[2]=Math.floor(n[2]),t},round:function(n,t){return(t=t||new x(3))[0]=Math.round(n[0]),t[1]=Math.round(n[1]),t[2]=Math.round(n[2]),t},clamp:function(n,t=0,e=1,r){return(r=r||new x(3))[0]=Math.min(e,Math.max(t,n[0])),r[1]=Math.min(e,Math.max(t,n[1])),r[2]=Math.min(e,Math.max(t,n[2])),r},add:function(n,t,e){return(e=e||new x(3))[0]=n[0]+t[0],e[1]=n[1]+t[1],e[2]=n[2]+t[2],e},addScaled:function(n,t,e,r){return(r=r||new x(3))[0]=n[0]+t[0]*e,r[1]=n[1]+t[1]*e,r[2]=n[2]+t[2]*e,r},angle:function(n,t){let e=n[0],r=n[1],u=n[2],a=n[0],o=n[1],i=n[2],c=Math.sqrt(e*e+r*r+u*u)*Math.sqrt(a*a+o*o+i*i),l=c&&F(n,t)/c;return Math.acos(l)},subtract:S,sub:S,equalsApproximately:function(n,t){return 1e-6>Math.abs(n[0]-t[0])&&1e-6>Math.abs(n[1]-t[1])&&1e-6>Math.abs(n[2]-t[2])},equals:function(n,t){return n[0]===t[0]&&n[1]===t[1]&&n[2]===t[2]},lerp:function(n,t,e,r){return(r=r||new x(3))[0]=n[0]+e*(t[0]-n[0]),r[1]=n[1]+e*(t[1]-n[1]),r[2]=n[2]+e*(t[2]-n[2]),r},lerpV:function(n,t,e,r){return(r=r||new x(3))[0]=n[0]+e[0]*(t[0]-n[0]),r[1]=n[1]+e[1]*(t[1]-n[1]),r[2]=n[2]+e[2]*(t[2]-n[2]),r},max:function(n,t,e){return(e=e||new x(3))[0]=Math.max(n[0],t[0]),e[1]=Math.max(n[1],t[1]),e[2]=Math.max(n[2],t[2]),e},min:function(n,t,e){return(e=e||new x(3))[0]=Math.min(n[0],t[0]),e[1]=Math.min(n[1],t[1]),e[2]=Math.min(n[2],t[2]),e},mulScalar:g,scale:g,divScalar:function(n,t,e){return(e=e||new x(3))[0]=n[0]/t,e[1]=n[1]/t,e[2]=n[2]/t,e},inverse:A,invert:A,cross:_,dot:F,length:z,len:z,lengthSq:T,lenSq:T,distance:V,dist:V,distanceSq:k,distSq:k,normalize:j,negate:function(n,t){return(t=t||new x(3))[0]=-n[0],t[1]=-n[1],t[2]=-n[2],t},copy:D,clone:D,multiply:O,mul:O,divide:E,div:E,random:function(n=1,t){t=t||new x(3);let e=2*Math.random()*Math.PI,r=2*Math.random()-1,u=Math.sqrt(1-r*r)*n;return t[0]=Math.cos(e)*u,t[1]=Math.sin(e)*u,t[2]=r*n,t},zero:function(n){return(n=n||new x(3))[0]=0,n[1]=0,n[2]=0,n},transformMat4:function(n,t,e){e=e||new x(3);let r=n[0],u=n[1],a=n[2],o=t[3]*r+t[7]*u+t[11]*a+t[15]||1;return e[0]=(t[0]*r+t[4]*u+t[8]*a+t[12])/o,e[1]=(t[1]*r+t[5]*u+t[9]*a+t[13])/o,e[2]=(t[2]*r+t[6]*u+t[10]*a+t[14])/o,e},transformMat4Upper3x3:function(n,t,e){e=e||new x(3);let r=n[0],u=n[1],a=n[2];return e[0]=r*t[0]+u*t[4]+a*t[8],e[1]=r*t[1]+u*t[5]+a*t[9],e[2]=r*t[2]+u*t[6]+a*t[10],e},transformMat3:function(n,t,e){e=e||new x(3);let r=n[0],u=n[1],a=n[2];return e[0]=r*t[0]+u*t[4]+a*t[8],e[1]=r*t[1]+u*t[5]+a*t[9],e[2]=r*t[2]+u*t[6]+a*t[10],e},transformQuat:function(n,t,e){e=e||new x(3);let r=t[0],u=t[1],a=t[2],o=2*t[3],i=n[0],c=n[1],l=n[2],f=u*l-a*c,h=a*i-r*l,s=r*c-u*i;return e[0]=i+f*o+(u*s-a*h)*2,e[1]=c+h*o+(a*f-r*s)*2,e[2]=l+s*o+(r*h-u*f)*2,e},getTranslation:function(n,t){return(t=t||new x(3))[0]=n[12],t[1]=n[13],t[2]=n[14],t},getAxis:function(n,t,e){e=e||new x(3);let r=4*t;return e[0]=n[r+0],e[1]=n[r+1],e[2]=n[r+2],e},getScaling:function(n,t){t=t||new x(3);let e=n[0],r=n[1],u=n[2],a=n[4],o=n[5],i=n[6],c=n[8],l=n[9],f=n[10];return t[0]=Math.sqrt(e*e+r*r+u*u),t[1]=Math.sqrt(a*a+o*o+i*i),t[2]=Math.sqrt(c*c+l*l+f*f),t}});let P=Float32Array;function R(n,t){return(t=t||new P(16))[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],t[9]=n[9],t[10]=n[10],t[11]=n[11],t[12]=n[12],t[13]=n[13],t[14]=n[14],t[15]=n[15],t}function C(n){return(n=n||new P(16))[0]=1,n[1]=0,n[2]=0,n[3]=0,n[4]=0,n[5]=1,n[6]=0,n[7]=0,n[8]=0,n[9]=0,n[10]=1,n[11]=0,n[12]=0,n[13]=0,n[14]=0,n[15]=1,n}function N(n,t){t=t||new P(16);let e=n[0],r=n[1],u=n[2],a=n[3],o=n[4],i=n[5],c=n[6],l=n[7],f=n[8],h=n[9],s=n[10],M=n[11],w=n[12],d=n[13],m=n[14],v=n[15],p=s*v,q=m*M,b=c*v,x=m*l,y=c*M,S=s*l,g=u*v,A=m*a,_=u*M,F=s*a,z=u*l,T=c*a,V=f*d,k=w*h,j=o*d,D=w*i,O=o*h,E=f*i,I=e*d,R=w*r,C=e*h,N=f*r,Q=e*i,X=o*r,Y=p*i+x*h+y*d-(q*i+b*h+S*d),Z=q*r+g*h+F*d-(p*r+A*h+_*d),K=b*r+A*i+z*d-(x*r+g*i+T*d),U=S*r+_*i+T*h-(y*r+F*i+z*h),B=1/(e*Y+o*Z+f*K+w*U);return t[0]=B*Y,t[1]=B*Z,t[2]=B*K,t[3]=B*U,t[4]=B*(q*o+b*f+S*w-(p*o+x*f+y*w)),t[5]=B*(p*e+A*f+_*w-(q*e+g*f+F*w)),t[6]=B*(x*e+g*o+T*w-(b*e+A*o+z*w)),t[7]=B*(y*e+F*o+z*f-(S*e+_*o+T*f)),t[8]=B*(V*l+D*M+O*v-(k*l+j*M+E*v)),t[9]=B*(k*a+I*M+N*v-(V*a+R*M+C*v)),t[10]=B*(j*a+R*l+Q*v-(D*a+I*l+X*v)),t[11]=B*(E*a+C*l+X*M-(O*a+N*l+Q*M)),t[12]=B*(j*s+E*m+k*c-(O*m+V*c+D*s)),t[13]=B*(C*m+V*u+R*s-(I*s+N*m+k*u)),t[14]=B*(I*c+X*m+D*u-(Q*m+j*u+R*c)),t[15]=B*(Q*s+O*u+N*c-(C*c+X*s+E*u)),t}function Q(n,t,e){e=e||new P(16);let r=n[0],u=n[1],a=n[2],o=n[3],i=n[4],c=n[5],l=n[6],f=n[7],h=n[8],s=n[9],M=n[10],w=n[11],d=n[12],m=n[13],v=n[14],p=n[15],q=t[0],b=t[1],x=t[2],y=t[3],S=t[4],g=t[5],A=t[6],_=t[7],F=t[8],z=t[9],T=t[10],V=t[11],k=t[12],j=t[13],D=t[14],O=t[15];return e[0]=r*q+i*b+h*x+d*y,e[1]=u*q+c*b+s*x+m*y,e[2]=a*q+l*b+M*x+v*y,e[3]=o*q+f*b+w*x+p*y,e[4]=r*S+i*g+h*A+d*_,e[5]=u*S+c*g+s*A+m*_,e[6]=a*S+l*g+M*A+v*_,e[7]=o*S+f*g+w*A+p*_,e[8]=r*F+i*z+h*T+d*V,e[9]=u*F+c*z+s*T+m*V,e[10]=a*F+l*z+M*T+v*V,e[11]=o*F+f*z+w*T+p*V,e[12]=r*k+i*j+h*D+d*O,e[13]=u*k+c*j+s*D+m*O,e[14]=a*k+l*j+M*D+v*O,e[15]=o*k+f*j+w*D+p*O,e}function X(n,t,e){e=e||new P(16);let r=n[0],u=n[1],a=n[2],o=Math.sqrt(r*r+u*u+a*a);r/=o,u/=o,a/=o;let i=r*r,c=u*u,l=a*a,f=Math.cos(t),h=Math.sin(t),s=1-f;return e[0]=i+(1-i)*f,e[1]=r*u*s+a*h,e[2]=r*a*s-u*h,e[3]=0,e[4]=r*u*s-a*h,e[5]=c+(1-c)*f,e[6]=u*a*s+r*h,e[7]=0,e[8]=r*a*s+u*h,e[9]=u*a*s-r*h,e[10]=l+(1-l)*f,e[11]=0,e[12]=0,e[13]=0,e[14]=0,e[15]=1,e}function Y(n,t,e,r){r=r||new P(16);let u=t[0],a=t[1],o=t[2],i=Math.sqrt(u*u+a*a+o*o);u/=i,a/=i,o/=i;let c=u*u,l=a*a,f=o*o,h=Math.cos(e),s=Math.sin(e),M=1-h,w=c+(1-c)*h,d=u*a*M+o*s,m=u*o*M-a*s,v=u*a*M-o*s,p=l+(1-l)*h,q=a*o*M+u*s,b=u*o*M+a*s,x=a*o*M-u*s,y=f+(1-f)*h,S=n[0],g=n[1],A=n[2],_=n[3],F=n[4],z=n[5],T=n[6],V=n[7],k=n[8],j=n[9],D=n[10],O=n[11];return r[0]=w*S+d*F+m*k,r[1]=w*g+d*z+m*j,r[2]=w*A+d*T+m*D,r[3]=w*_+d*V+m*O,r[4]=v*S+p*F+q*k,r[5]=v*g+p*z+q*j,r[6]=v*A+p*T+q*D,r[7]=v*_+p*V+q*O,r[8]=b*S+x*F+y*k,r[9]=b*g+x*z+y*j,r[10]=b*A+x*T+y*D,r[11]=b*_+x*V+y*O,n!==r&&(r[12]=n[12],r[13]=n[13],r[14]=n[14],r[15]=n[15]),r}var Z=Object.freeze({__proto__:null,setDefaultType:function(n){let t=P;return P=n,t},create:function(n,t,e,r,u,a,o,i,c,l,f,h,s,M,w,d){let m=new P(16);return void 0!==n&&(m[0]=n,void 0!==t&&(m[1]=t,void 0!==e&&(m[2]=e,void 0!==r&&(m[3]=r,void 0!==u&&(m[4]=u,void 0!==a&&(m[5]=a,void 0!==o&&(m[6]=o,void 0!==i&&(m[7]=i,void 0!==c&&(m[8]=c,void 0!==l&&(m[9]=l,void 0!==f&&(m[10]=f,void 0!==h&&(m[11]=h,void 0!==s&&(m[12]=s,void 0!==M&&(m[13]=M,void 0!==w&&(m[14]=w,void 0!==d&&(m[15]=d)))))))))))))))),m},set:function(n,t,e,r,u,a,o,i,c,l,f,h,s,M,w,d,m){return(m=m||new P(16))[0]=n,m[1]=t,m[2]=e,m[3]=r,m[4]=u,m[5]=a,m[6]=o,m[7]=i,m[8]=c,m[9]=l,m[10]=f,m[11]=h,m[12]=s,m[13]=M,m[14]=w,m[15]=d,m},fromMat3:function(n,t){return(t=t||new P(16))[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=0,t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=0,t[8]=n[8],t[9]=n[9],t[10]=n[10],t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,t},fromQuat:function(n,t){t=t||new P(16);let e=n[0],r=n[1],u=n[2],a=n[3],o=e+e,i=r+r,c=u+u,l=e*o,f=r*o,h=r*i,s=u*o,M=u*i,w=u*c,d=a*o,m=a*i,v=a*c;return t[0]=1-h-w,t[1]=f+v,t[2]=s-m,t[3]=0,t[4]=f-v,t[5]=1-l-w,t[6]=M+d,t[7]=0,t[8]=s+m,t[9]=M-d,t[10]=1-l-h,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,t},negate:function(n,t){return(t=t||new P(16))[0]=-n[0],t[1]=-n[1],t[2]=-n[2],t[3]=-n[3],t[4]=-n[4],t[5]=-n[5],t[6]=-n[6],t[7]=-n[7],t[8]=-n[8],t[9]=-n[9],t[10]=-n[10],t[11]=-n[11],t[12]=-n[12],t[13]=-n[13],t[14]=-n[14],t[15]=-n[15],t},copy:R,clone:R,equalsApproximately:function(n,t){return 1e-6>Math.abs(n[0]-t[0])&&1e-6>Math.abs(n[1]-t[1])&&1e-6>Math.abs(n[2]-t[2])&&1e-6>Math.abs(n[3]-t[3])&&1e-6>Math.abs(n[4]-t[4])&&1e-6>Math.abs(n[5]-t[5])&&1e-6>Math.abs(n[6]-t[6])&&1e-6>Math.abs(n[7]-t[7])&&1e-6>Math.abs(n[8]-t[8])&&1e-6>Math.abs(n[9]-t[9])&&1e-6>Math.abs(n[10]-t[10])&&1e-6>Math.abs(n[11]-t[11])&&1e-6>Math.abs(n[12]-t[12])&&1e-6>Math.abs(n[13]-t[13])&&1e-6>Math.abs(n[14]-t[14])&&1e-6>Math.abs(n[15]-t[15])},equals:function(n,t){return n[0]===t[0]&&n[1]===t[1]&&n[2]===t[2]&&n[3]===t[3]&&n[4]===t[4]&&n[5]===t[5]&&n[6]===t[6]&&n[7]===t[7]&&n[8]===t[8]&&n[9]===t[9]&&n[10]===t[10]&&n[11]===t[11]&&n[12]===t[12]&&n[13]===t[13]&&n[14]===t[14]&&n[15]===t[15]},identity:C,transpose:function(n,t){if((t=t||new P(16))===n){let e;return e=n[1],n[1]=n[4],n[4]=e,e=n[2],n[2]=n[8],n[8]=e,e=n[3],n[3]=n[12],n[12]=e,e=n[6],n[6]=n[9],n[9]=e,e=n[7],n[7]=n[13],n[13]=e,e=n[11],n[11]=n[14],n[14]=e,t}let r=n[0],u=n[1],a=n[2],o=n[3],i=n[4],c=n[5],l=n[6],f=n[7],h=n[8],s=n[9],M=n[10],w=n[11],d=n[12],m=n[13],v=n[14],p=n[15];return t[0]=r,t[1]=i,t[2]=h,t[3]=d,t[4]=u,t[5]=c,t[6]=s,t[7]=m,t[8]=a,t[9]=l,t[10]=M,t[11]=v,t[12]=o,t[13]=f,t[14]=w,t[15]=p,t},inverse:N,determinant:function(n){let t=n[0],e=n[1],r=n[2],u=n[3],a=n[4],o=n[5],i=n[6],c=n[7],l=n[8],f=n[9],h=n[10],s=n[11],M=n[12],w=n[13],d=n[14],m=n[15],v=h*m,p=d*s,q=i*m,b=d*c,x=i*s,y=h*c,S=r*m,g=d*u,A=r*s,_=h*u,F=r*c,z=i*u;return t*(v*o+b*f+x*w-(p*o+q*f+y*w))+a*(p*e+S*f+_*w-(v*e+g*f+A*w))+l*(q*e+g*o+F*w-(b*e+S*o+z*w))+M*(y*e+A*o+z*f-(x*e+_*o+F*f))},invert:N,multiply:Q,mul:Q,setTranslation:function(n,t,e){return n!==(e=e||C())&&(e[0]=n[0],e[1]=n[1],e[2]=n[2],e[3]=n[3],e[4]=n[4],e[5]=n[5],e[6]=n[6],e[7]=n[7],e[8]=n[8],e[9]=n[9],e[10]=n[10],e[11]=n[11]),e[12]=t[0],e[13]=t[1],e[14]=t[2],e[15]=1,e},getTranslation:function(n,t){return(t=t||y())[0]=n[12],t[1]=n[13],t[2]=n[14],t},getAxis:function(n,t,e){e=e||y();let r=4*t;return e[0]=n[r+0],e[1]=n[r+1],e[2]=n[r+2],e},setAxis:function(n,t,e,r){r!==n&&(r=R(n,r));let u=4*e;return r[u+0]=t[0],r[u+1]=t[1],r[u+2]=t[2],r},getScaling:function(n,t){t=t||y();let e=n[0],r=n[1],u=n[2],a=n[4],o=n[5],i=n[6],c=n[8],l=n[9],f=n[10];return t[0]=Math.sqrt(e*e+r*r+u*u),t[1]=Math.sqrt(a*a+o*o+i*i),t[2]=Math.sqrt(c*c+l*l+f*f),t},perspective:function(n,t,e,r,u){u=u||new P(16);let a=Math.tan(.5*Math.PI-.5*n);if(u[0]=a/t,u[1]=0,u[2]=0,u[3]=0,u[4]=0,u[5]=a,u[6]=0,u[7]=0,u[8]=0,u[9]=0,u[11]=-1,u[12]=0,u[13]=0,u[15]=0,r===1/0)u[10]=-1,u[14]=-e;else{let o=1/(e-r);u[10]=r*o,u[14]=r*e*o}return u},ortho:function(n,t,e,r,u,a,o){return(o=o||new P(16))[0]=2/(t-n),o[1]=0,o[2]=0,o[3]=0,o[4]=0,o[5]=2/(r-e),o[6]=0,o[7]=0,o[8]=0,o[9]=0,o[10]=1/(u-a),o[11]=0,o[12]=(t+n)/(n-t),o[13]=(r+e)/(e-r),o[14]=u/(u-a),o[15]=1,o},frustum:function(n,t,e,r,u,a,o){o=o||new P(16);let i=t-n,c=r-e,l=u-a;return o[0]=2*u/i,o[1]=0,o[2]=0,o[3]=0,o[4]=0,o[5]=2*u/c,o[6]=0,o[7]=0,o[8]=(n+t)/i,o[9]=(r+e)/c,o[10]=a/l,o[11]=-1,o[12]=0,o[13]=0,o[14]=u*a/l,o[15]=0,o},aim:function(n,t,e,o){return o=o||new P(16),r=r||y(),u=u||y(),j(S(t,n,a=a||y()),a),j(_(e,a,r),r),j(_(a,r,u),u),o[0]=r[0],o[1]=r[1],o[2]=r[2],o[3]=0,o[4]=u[0],o[5]=u[1],o[6]=u[2],o[7]=0,o[8]=a[0],o[9]=a[1],o[10]=a[2],o[11]=0,o[12]=n[0],o[13]=n[1],o[14]=n[2],o[15]=1,o},cameraAim:function(n,t,e,o){return o=o||new P(16),r=r||y(),u=u||y(),j(S(n,t,a=a||y()),a),j(_(e,a,r),r),j(_(a,r,u),u),o[0]=r[0],o[1]=r[1],o[2]=r[2],o[3]=0,o[4]=u[0],o[5]=u[1],o[6]=u[2],o[7]=0,o[8]=a[0],o[9]=a[1],o[10]=a[2],o[11]=0,o[12]=n[0],o[13]=n[1],o[14]=n[2],o[15]=1,o},lookAt:function(n,t,e,o){return o=o||new P(16),r=r||y(),u=u||y(),j(S(n,t,a=a||y()),a),j(_(e,a,r),r),j(_(a,r,u),u),o[0]=r[0],o[1]=u[0],o[2]=a[0],o[3]=0,o[4]=r[1],o[5]=u[1],o[6]=a[1],o[7]=0,o[8]=r[2],o[9]=u[2],o[10]=a[2],o[11]=0,o[12]=-(r[0]*n[0]+r[1]*n[1]+r[2]*n[2]),o[13]=-(u[0]*n[0]+u[1]*n[1]+u[2]*n[2]),o[14]=-(a[0]*n[0]+a[1]*n[1]+a[2]*n[2]),o[15]=1,o},translation:function(n,t){return(t=t||new P(16))[0]=1,t[1]=0,t[2]=0,t[3]=0,t[4]=0,t[5]=1,t[6]=0,t[7]=0,t[8]=0,t[9]=0,t[10]=1,t[11]=0,t[12]=n[0],t[13]=n[1],t[14]=n[2],t[15]=1,t},translate:function(n,t,e){e=e||new P(16);let r=t[0],u=t[1],a=t[2],o=n[0],i=n[1],c=n[2],l=n[3],f=n[4],h=n[5],s=n[6],M=n[7],w=n[8],d=n[9],m=n[10],v=n[11],p=n[12],q=n[13],b=n[14],x=n[15];return n!==e&&(e[0]=o,e[1]=i,e[2]=c,e[3]=l,e[4]=f,e[5]=h,e[6]=s,e[7]=M,e[8]=w,e[9]=d,e[10]=m,e[11]=v),e[12]=o*r+f*u+w*a+p,e[13]=i*r+h*u+d*a+q,e[14]=c*r+s*u+m*a+b,e[15]=l*r+M*u+v*a+x,e},rotationX:function(n,t){t=t||new P(16);let e=Math.cos(n),r=Math.sin(n);return t[0]=1,t[1]=0,t[2]=0,t[3]=0,t[4]=0,t[5]=e,t[6]=r,t[7]=0,t[8]=0,t[9]=-r,t[10]=e,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,t},rotateX:function(n,t,e){e=e||new P(16);let r=n[4],u=n[5],a=n[6],o=n[7],i=n[8],c=n[9],l=n[10],f=n[11],h=Math.cos(t),s=Math.sin(t);return e[4]=h*r+s*i,e[5]=h*u+s*c,e[6]=h*a+s*l,e[7]=h*o+s*f,e[8]=h*i-s*r,e[9]=h*c-s*u,e[10]=h*l-s*a,e[11]=h*f-s*o,n!==e&&(e[0]=n[0],e[1]=n[1],e[2]=n[2],e[3]=n[3],e[12]=n[12],e[13]=n[13],e[14]=n[14],e[15]=n[15]),e},rotationY:function(n,t){t=t||new P(16);let e=Math.cos(n),r=Math.sin(n);return t[0]=e,t[1]=0,t[2]=-r,t[3]=0,t[4]=0,t[5]=1,t[6]=0,t[7]=0,t[8]=r,t[9]=0,t[10]=e,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,t},rotateY:function(n,t,e){e=e||new P(16);let r=n[0],u=n[1],a=n[2],o=n[3],i=n[8],c=n[9],l=n[10],f=n[11],h=Math.cos(t),s=Math.sin(t);return e[0]=h*r-s*i,e[1]=h*u-s*c,e[2]=h*a-s*l,e[3]=h*o-s*f,e[8]=h*i+s*r,e[9]=h*c+s*u,e[10]=h*l+s*a,e[11]=h*f+s*o,n!==e&&(e[4]=n[4],e[5]=n[5],e[6]=n[6],e[7]=n[7],e[12]=n[12],e[13]=n[13],e[14]=n[14],e[15]=n[15]),e},rotationZ:function(n,t){t=t||new P(16);let e=Math.cos(n),r=Math.sin(n);return t[0]=e,t[1]=r,t[2]=0,t[3]=0,t[4]=-r,t[5]=e,t[6]=0,t[7]=0,t[8]=0,t[9]=0,t[10]=1,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,t},rotateZ:function(n,t,e){e=e||new P(16);let r=n[0],u=n[1],a=n[2],o=n[3],i=n[4],c=n[5],l=n[6],f=n[7],h=Math.cos(t),s=Math.sin(t);return e[0]=h*r+s*i,e[1]=h*u+s*c,e[2]=h*a+s*l,e[3]=h*o+s*f,e[4]=h*i-s*r,e[5]=h*c-s*u,e[6]=h*l-s*a,e[7]=h*f-s*o,n!==e&&(e[8]=n[8],e[9]=n[9],e[10]=n[10],e[11]=n[11],e[12]=n[12],e[13]=n[13],e[14]=n[14],e[15]=n[15]),e},axisRotation:X,rotation:X,axisRotate:Y,rotate:Y,scaling:function(n,t){return(t=t||new P(16))[0]=n[0],t[1]=0,t[2]=0,t[3]=0,t[4]=0,t[5]=n[1],t[6]=0,t[7]=0,t[8]=0,t[9]=0,t[10]=n[2],t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,t},scale:function(n,t,e){e=e||new P(16);let r=t[0],u=t[1],a=t[2];return e[0]=r*n[0],e[1]=r*n[1],e[2]=r*n[2],e[3]=r*n[3],e[4]=u*n[4],e[5]=u*n[5],e[6]=u*n[6],e[7]=u*n[7],e[8]=a*n[8],e[9]=a*n[9],e[10]=a*n[10],e[11]=a*n[11],n!==e&&(e[12]=n[12],e[13]=n[13],e[14]=n[14],e[15]=n[15]),e},uniformScaling:function(n,t){return(t=t||new P(16))[0]=n,t[1]=0,t[2]=0,t[3]=0,t[4]=0,t[5]=n,t[6]=0,t[7]=0,t[8]=0,t[9]=0,t[10]=n,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,t},uniformScale:function(n,t,e){return(e=e||new P(16))[0]=t*n[0],e[1]=t*n[1],e[2]=t*n[2],e[3]=t*n[3],e[4]=t*n[4],e[5]=t*n[5],e[6]=t*n[6],e[7]=t*n[7],e[8]=t*n[8],e[9]=t*n[9],e[10]=t*n[10],e[11]=t*n[11],n!==e&&(e[12]=n[12],e[13]=n[13],e[14]=n[14],e[15]=n[15]),e}});Float32Array;let K=Float32Array;function U(n,t,e,r){let u=new K(4);return void 0!==n&&(u[0]=n,void 0!==t&&(u[1]=t,void 0!==e&&(u[2]=e,void 0!==r&&(u[3]=r)))),u}function B(n,t,e){return(e=e||new K(4))[0]=n[0]-t[0],e[1]=n[1]-t[1],e[2]=n[2]-t[2],e[3]=n[3]-t[3],e}function G(n,t,e){return(e=e||new K(4))[0]=n[0]*t,e[1]=n[1]*t,e[2]=n[2]*t,e[3]=n[3]*t,e}function H(n,t){return(t=t||new K(4))[0]=1/n[0],t[1]=1/n[1],t[2]=1/n[2],t[3]=1/n[3],t}function J(n){let t=n[0],e=n[1],r=n[2],u=n[3];return Math.sqrt(t*t+e*e+r*r+u*u)}function L(n){let t=n[0],e=n[1],r=n[2],u=n[3];return t*t+e*e+r*r+u*u}function W(n,t){let e=n[0]-t[0],r=n[1]-t[1],u=n[2]-t[2],a=n[3]-t[3];return Math.sqrt(e*e+r*r+u*u+a*a)}function $(n,t){let e=n[0]-t[0],r=n[1]-t[1],u=n[2]-t[2],a=n[3]-t[3];return e*e+r*r+u*u+a*a}function nn(n,t){return(t=t||new K(4))[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t}function nt(n,t,e){return(e=e||new K(4))[0]=n[0]*t[0],e[1]=n[1]*t[1],e[2]=n[2]*t[2],e[3]=n[3]*t[3],e}function ne(n,t,e){return(e=e||new K(4))[0]=n[0]/t[0],e[1]=n[1]/t[1],e[2]=n[2]/t[2],e[3]=n[3]/t[3],e}var nr=Object.freeze({__proto__:null,create:U,setDefaultType:function(n){let t=K;return K=n,t},fromValues:U,set:function(n,t,e,r,u){return(u=u||new K(4))[0]=n,u[1]=t,u[2]=e,u[3]=r,u},ceil:function(n,t){return(t=t||new K(4))[0]=Math.ceil(n[0]),t[1]=Math.ceil(n[1]),t[2]=Math.ceil(n[2]),t[3]=Math.ceil(n[3]),t},floor:function(n,t){return(t=t||new K(4))[0]=Math.floor(n[0]),t[1]=Math.floor(n[1]),t[2]=Math.floor(n[2]),t[3]=Math.floor(n[3]),t},round:function(n,t){return(t=t||new K(4))[0]=Math.round(n[0]),t[1]=Math.round(n[1]),t[2]=Math.round(n[2]),t[3]=Math.round(n[3]),t},clamp:function(n,t=0,e=1,r){return(r=r||new K(4))[0]=Math.min(e,Math.max(t,n[0])),r[1]=Math.min(e,Math.max(t,n[1])),r[2]=Math.min(e,Math.max(t,n[2])),r[3]=Math.min(e,Math.max(t,n[3])),r},add:function(n,t,e){return(e=e||new K(4))[0]=n[0]+t[0],e[1]=n[1]+t[1],e[2]=n[2]+t[2],e[3]=n[3]+t[3],e},addScaled:function(n,t,e,r){return(r=r||new K(4))[0]=n[0]+t[0]*e,r[1]=n[1]+t[1]*e,r[2]=n[2]+t[2]*e,r[3]=n[3]+t[3]*e,r},subtract:B,sub:B,equalsApproximately:function(n,t){return 1e-6>Math.abs(n[0]-t[0])&&1e-6>Math.abs(n[1]-t[1])&&1e-6>Math.abs(n[2]-t[2])&&1e-6>Math.abs(n[3]-t[3])},equals:function(n,t){return n[0]===t[0]&&n[1]===t[1]&&n[2]===t[2]&&n[3]===t[3]},lerp:function(n,t,e,r){return(r=r||new K(4))[0]=n[0]+e*(t[0]-n[0]),r[1]=n[1]+e*(t[1]-n[1]),r[2]=n[2]+e*(t[2]-n[2]),r[3]=n[3]+e*(t[3]-n[3]),r},lerpV:function(n,t,e,r){return(r=r||new K(4))[0]=n[0]+e[0]*(t[0]-n[0]),r[1]=n[1]+e[1]*(t[1]-n[1]),r[2]=n[2]+e[2]*(t[2]-n[2]),r[3]=n[3]+e[3]*(t[3]-n[3]),r},max:function(n,t,e){return(e=e||new K(4))[0]=Math.max(n[0],t[0]),e[1]=Math.max(n[1],t[1]),e[2]=Math.max(n[2],t[2]),e[3]=Math.max(n[3],t[3]),e},min:function(n,t,e){return(e=e||new K(4))[0]=Math.min(n[0],t[0]),e[1]=Math.min(n[1],t[1]),e[2]=Math.min(n[2],t[2]),e[3]=Math.min(n[3],t[3]),e},mulScalar:G,scale:G,divScalar:function(n,t,e){return(e=e||new K(4))[0]=n[0]/t,e[1]=n[1]/t,e[2]=n[2]/t,e[3]=n[3]/t,e},inverse:H,invert:H,dot:function(n,t){return n[0]*t[0]+n[1]*t[1]+n[2]*t[2]+n[3]*t[3]},length:J,len:J,lengthSq:L,lenSq:L,distance:W,dist:W,distanceSq:$,distSq:$,normalize:function(n,t){t=t||new K(4);let e=n[0],r=n[1],u=n[2],a=n[3],o=Math.sqrt(e*e+r*r+u*u+a*a);return o>1e-5?(t[0]=e/o,t[1]=r/o,t[2]=u/o,t[3]=a/o):(t[0]=0,t[1]=0,t[2]=0,t[3]=0),t},negate:function(n,t){return(t=t||new K(4))[0]=-n[0],t[1]=-n[1],t[2]=-n[2],t[3]=-n[3],t},copy:nn,clone:nn,multiply:nt,mul:nt,divide:ne,div:ne,zero:function(n){return(n=n||new K(4))[0]=0,n[1]=0,n[2]=0,n[3]=0,n},transformMat4:function(n,t,e){e=e||new K(4);let r=n[0],u=n[1],a=n[2],o=n[3];return e[0]=t[0]*r+t[4]*u+t[8]*a+t[12]*o,e[1]=t[1]*r+t[5]*u+t[9]*a+t[13]*o,e[2]=t[2]*r+t[6]*u+t[10]*a+t[14]*o,e[3]=t[3]*r+t[7]*u+t[11]*a+t[15]*o,e}})}}]);
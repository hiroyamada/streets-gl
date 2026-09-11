#include <versionPrecision>
#include <gBufferOut>

in vec4 vClipPos;
in vec4 vClipPosPrev;
in vec3 vNormal;
in vec3 vColor;

uniform MainBlock {
	mat4 projectionMatrix;
	mat4 modelMatrix;
	mat4 viewMatrix;
	mat4 modelViewMatrixPrev;
	vec3 tint;
	vec3 glow;
};

#include <packNormal>
#include <getMotionVector>

void main() {
	outColor = vec4(tint * vColor, 1);
	outGlow = glow;
	outNormal = packNormal(normalize(vNormal));
	outRoughnessMetalnessF0 = vec3(0.6, 0, 0.03);
	outMotion = getMotionVector(vClipPos, vClipPosPrev);
	outObjectId = 0u;
}

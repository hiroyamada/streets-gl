#include <versionPrecision>

in vec3 position;
in vec3 normal;

out vec4 vClipPos;
out vec4 vClipPosPrev;
out vec3 vNormal;

uniform MainBlock {
	mat4 projectionMatrix;
	mat4 modelMatrix;
	mat4 viewMatrix;
	mat4 modelViewMatrixPrev;
	vec3 color;
	vec3 glow;
};

void main() {
	vec3 modelNormal = normalize((modelMatrix * vec4(normal, 0)).xyz);
	vNormal = normalize((viewMatrix * vec4(modelNormal, 0)).xyz);

	vec4 cameraSpacePosition = viewMatrix * modelMatrix * vec4(position, 1);
	vec4 cameraSpacePositionPrev = modelViewMatrixPrev * vec4(position, 1);

	vClipPos = projectionMatrix * cameraSpacePosition;
	vClipPosPrev = projectionMatrix * cameraSpacePositionPrev;

	gl_Position = vClipPos;
}

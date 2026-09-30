openapi: 3.1.0
info:
  title: Service __name__
  version: 1.0.0
  description: (à décrire). Les corps de requête et de réponse sont des schémas de contracts/schemas/.
paths:
  /health:
    get:
      operationId: getHealth
      responses:
        '200':
          description: Le service répond.
          content:
            application/json:
              schema:
                type: object
                required: [status]
                properties:
                  status: { type: string, enum: [ok] }

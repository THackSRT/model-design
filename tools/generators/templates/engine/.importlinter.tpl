[importlinter]
include_external_packages = True
root_packages =
    __name_snake__

[importlinter:contract:layers]
name = Le cœur ne dépend ni du contrat ni de l'API
type = layers
layers =
    __name_snake__.main
    __name_snake__.api
    __name_snake__.spec
    __name_snake__.core

[importlinter:contract:pure-core]
name = Le cœur n'importe aucun framework
type = forbidden
source_modules =
    __name_snake__.core
forbidden_modules =
    fastapi
    pydantic
    atelier_contracts
    atelier_engine_kit

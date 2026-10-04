// Registre des six modèles testés et de leurs jeux de mesures de référence (tailles du paquet @freesewing/models).
import { Bella } from '@freesewing/bella'
import { Penelope } from '@freesewing/penelope'
import { Sandy } from '@freesewing/sandy'
import { Titan } from '@freesewing/titan'
import { Teagan } from '@freesewing/teagan'
import { Tiberius } from '@freesewing/tiberius'
import * as models from '@freesewing/models'

export const DESIGNS = { Bella, Penelope, Sandy, Titan, Teagan, Tiberius }

// Tailles de référence : « cisFemaleAdult36 » = tour de cou 36 cm, femme adulte (jeux FreeSewing, en mm).
export const SIZES = {
  female: models.sizes.cisFemaleAdult.map((n) => 'cisFemaleAdult' + n),
  male: models.sizes.cisMaleAdult.map((n) => 'cisMaleAdult' + n),
}
export const sizeMeasurements = (name) => models[name]
export const SIZE_LIST = [...SIZES.female, ...SIZES.male]
export { models }

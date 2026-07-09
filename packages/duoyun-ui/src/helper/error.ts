/**
 * effect module, handle other module error
 */
import { errorHandler } from 'tap-ui/helper/base/error';

import { Toast } from '../elements/toast';

errorHandler.show = (message) => Toast.open('error', message);

"use strict";
// Copyright 2024 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _DefaultAwsSecurityCredentialsSupplier_instances, _DefaultAwsSecurityCredentialsSupplier_getImdsV2SessionToken, _DefaultAwsSecurityCredentialsSupplier_getAwsRoleName, _DefaultAwsSecurityCredentialsSupplier_retrieveAwsSecurityCredentials, _DefaultAwsSecurityCredentialsSupplier_regionFromEnv_get, _DefaultAwsSecurityCredentialsSupplier_securityCredentialsFromEnv_get;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultAwsSecurityCredentialsSupplier = void 0;
/**
 * Internal AWS security credentials supplier implementation used by {@link AwsClient}
 * when a credential source is provided instead of a user defined supplier.
 * The logic is summarized as:
 * 1. If imdsv2_session_token_url is provided in the credential source, then
 *    fetch the aws session token and include it in the headers of the
 *    metadata requests. This is a requirement for IDMSv2 but optional
 *    for IDMSv1.
 * 2. Retrieve AWS region from availability-zone.
 * 3a. Check AWS credentials in environment variables. If not found, get
 *     from security-credentials endpoint.
 * 3b. Get AWS credentials from security-credentials endpoint. In order
 *     to retrieve this, the AWS role needs to be determined by calling
 *     security-credentials endpoint without any argument. Then the
 *     credentials can be retrieved via: security-credentials/role_name
 * 4. Generate the signed request to AWS STS GetCallerIdentity action.
 * 5. Inject x-goog-cloud-target-resource into header and serialize the
 *    signed request. This will be the subject-token to pass to GCP STS.
 */
class DefaultAwsSecurityCredentialsSupplier {
    /**
     * Instantiates a new DefaultAwsSecurityCredentialsSupplier using information
     * from the credential_source stored in the ADC file.
     * @param opts The default aws security credentials supplier options object to
     *   build the supplier with.
     */
    constructor(opts) {
        _DefaultAwsSecurityCredentialsSupplier_instances.add(this);
        this.regionUrl = opts.regionUrl;
        this.securityCredentialsUrl = opts.securityCredentialsUrl;
        this.imdsV2SessionTokenUrl = opts.imdsV2SessionTokenUrl;
        this.additionalGaxiosOptions = opts.additionalGaxiosOptions;
    }
    /**
     * Returns the active AWS region. This first checks to see if the region
     * is available as an environment variable. If it is not, then the supplier
     * will call the region URL.
     * @param context {@link ExternalAccountSupplierContext} from the calling
     *   {@link AwsClient}, contains the requested audience and subject token type
     *   for the external account identity.
     * @return A promise that resolves with the AWS region string.
     */
    async getAwsRegion(context) {
        // Priority order for region determination:
        // AWS_REGION > AWS_DEFAULT_REGION > metadata server.
        if (__classPrivateFieldGet(this, _DefaultAwsSecurityCredentialsSupplier_instances, "a", _DefaultAwsSecurityCredentialsSupplier_regionFromEnv_get)) {
            return __classPrivateFieldGet(this, _DefaultAwsSecurityCredentialsSupplier_instances, "a", _DefaultAwsSecurityCredentialsSupplier_regionFromEnv_get);
        }
        const metadataHeaders = {};
        if (!__classPrivateFieldGet(this, _DefaultAwsSecurityCredentialsSupplier_instances, "a", _DefaultAwsSecurityCredentialsSupplier_regionFromEnv_get) && this.imdsV2SessionTokenUrl) {
            metadataHeaders['x-aws-ec2-metadata-token'] =
                await __classPrivateFieldGet(this, _DefaultAwsSecurityCredentialsSupplier_instances, "m", _DefaultAwsSecurityCredentialsSupplier_getImdsV2SessionToken).call(this, context.transporter);
        }
        if (!this.regionUrl) {
            throw new Error('Unable to determine AWS region due to missing ' +
                '"options.credential_source.region_url"');
        }
        const opts = {
            ...this.additionalGaxiosOptions,
            url: this.regionUrl,
            method: 'GET',
            responseType: 'text',
            headers: metadataHeaders,
        };
        const response = await context.transporter.request(opts);
        // Remove last character. For example, if us-east-2b is returned,
        // the region would be us-east-2.
        return response.data.substr(0, response.data.length - 1);
    }
    /**
     * Returns AWS security credentials. This first checks to see if the credentials
     * is available as environment variables. If it is not, then the supplier
     * will call the security credentials URL.
     * @param context {@link ExternalAccountSupplierContext} from the calling
     *   {@link AwsClient}, contains the requested audience and subject token type
     *   for the external account identity.
     * @return A promise that resolves with the AWS security credentials.
     */
    async getAwsSecurityCredentials(context) {
        // Check environment variables for permanent credentials first.
        // https://docs.aws.amazon.com/general/latest/gr/aws-sec-cred-types.html
        if (__classPrivateFieldGet(this, _DefaultAwsSecurityCredentialsSupplier_instances, "a", _DefaultAwsSecurityCredentialsSupplier_securityCredentialsFromEnv_get)) {
            return __classPrivateFieldGet(this, _DefaultAwsSecurityCredentialsSupplier_instances, "a", _DefaultAwsSecurityCredentialsSupplier_securityCredentialsFromEnv_get);
        }
        const metadataHeaders = {};
        if (this.imdsV2SessionTokenUrl) {
            metadataHeaders['x-aws-ec2-metadata-token'] =
                await __classPrivateFieldGet(this, _DefaultAwsSecurityCredentialsSupplier_instances, "m", _DefaultAwsSecurityCredentialsSupplier_getImdsV2SessionToken).call(this, context.transporter);
        }
        // Since the role on a VM can change, we don't need to cache it.
        const roleName = await __classPrivateFieldGet(this, _DefaultAwsSecurityCredentialsSupplier_instances, "m", _DefaultAwsSecurityCredentialsSupplier_getAwsRoleName).call(this, metadataHeaders, context.transporter);
        // Temporary credentials typically last for several hours.
        // Expiration is returned in response.
        // Consider future optimization of this logic to cache AWS tokens
        // until their natural expiration.
        const awsCreds = await __classPrivateFieldGet(this, _DefaultAwsSecurityCredentialsSupplier_instances, "m", _DefaultAwsSecurityCredentialsSupplier_retrieveAwsSecurityCredentials).call(this, roleName, metadataHeaders, context.transporter);
        return {
            accessKeyId: awsCreds.AccessKeyId,
            secretAccessKey: awsCreds.SecretAccessKey,
            token: awsCreds.Token,
        };
    }
}
exports.DefaultAwsSecurityCredentialsSupplier = DefaultAwsSecurityCredentialsSupplier;
_DefaultAwsSecurityCredentialsSupplier_instances = new WeakSet(), _DefaultAwsSecurityCredentialsSupplier_getImdsV2SessionToken = 
/**
 * @param transporter The transporter to use for requests.
 * @return A promise that resolves with the IMDSv2 Session Token.
 */
async function _DefaultAwsSecurityCredentialsSupplier_getImdsV2SessionToken(transporter) {
    const opts = {
        ...this.additionalGaxiosOptions,
        url: this.imdsV2SessionTokenUrl,
        method: 'PUT',
        responseType: 'text',
        headers: { 'x-aws-ec2-metadata-token-ttl-seconds': '300' },
    };
    const response = await transporter.request(opts);
    return response.data;
}, _DefaultAwsSecurityCredentialsSupplier_getAwsRoleName = 
/**
 * @param headers The headers to be used in the metadata request.
 * @param transporter The transporter to use for requests.
 * @return A promise that resolves with the assigned role to the current
 *   AWS VM. This is needed for calling the security-credentials endpoint.
 */
async function _DefaultAwsSecurityCredentialsSupplier_getAwsRoleName(headers, transporter) {
    if (!this.securityCredentialsUrl) {
        throw new Error('Unable to determine AWS role name due to missing ' +
            '"options.credential_source.url"');
    }
    const opts = {
        ...this.additionalGaxiosOptions,
        url: this.securityCredentialsUrl,
        method: 'GET',
        responseType: 'text',
        headers: headers,
    };
    const response = await transporter.request(opts);
    return response.data;
}, _DefaultAwsSecurityCredentialsSupplier_retrieveAwsSecurityCredentials = 
/**
 * Retrieves the temporary AWS credentials by calling the security-credentials
 * endpoint as specified in the `credential_source` object.
 * @param roleName The role attached to the current VM.
 * @param headers The headers to be used in the metadata request.
 * @param transporter The transporter to use for requests.
 * @return A promise that resolves with the temporary AWS credentials
 *   needed for creating the GetCallerIdentity signed request.
 */
async function _DefaultAwsSecurityCredentialsSupplier_retrieveAwsSecurityCredentials(roleName, headers, transporter) {
    const response = await transporter.request({
        ...this.additionalGaxiosOptions,
        url: `${this.securityCredentialsUrl}/${roleName}`,
        responseType: 'json',
        headers: headers,
    });
    return response.data;
}, _DefaultAwsSecurityCredentialsSupplier_regionFromEnv_get = function _DefaultAwsSecurityCredentialsSupplier_regionFromEnv_get() {
    // The AWS region can be provided through AWS_REGION or AWS_DEFAULT_REGION.
    // Only one is required.
    return (process.env['AWS_REGION'] || process.env['AWS_DEFAULT_REGION'] || null);
}, _DefaultAwsSecurityCredentialsSupplier_securityCredentialsFromEnv_get = function _DefaultAwsSecurityCredentialsSupplier_securityCredentialsFromEnv_get() {
    // Both AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are required.
    if (process.env['AWS_ACCESS_KEY_ID'] &&
        process.env['AWS_SECRET_ACCESS_KEY']) {
        return {
            accessKeyId: process.env['AWS_ACCESS_KEY_ID'],
            secretAccessKey: process.env['AWS_SECRET_ACCESS_KEY'],
            token: process.env['AWS_SESSION_TOKEN'],
        };
    }
    return null;
};

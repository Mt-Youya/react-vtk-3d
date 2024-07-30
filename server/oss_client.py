import oss2
import requests
from oss2.credentials import Credentials, CredentialsProvider
import os

class CustomCredentialsProvider(CredentialsProvider):
    def __init__(self):
        try:
            self.initialized = False
            r = requests.get('https://your.server.oss.com/getStsToken', timeout=0.5)
            res = r.json()
            self.access_key_id = res['data']['accessKeyId']
            self.access_key_secret = res['data']['accessKeySecret']
            self.security_token = res['data']['stsToken']
            self.bucket = res['data']['bucket']
            region = res['data']['region']
            self.endpoint = f'https://{region}.aliyuncs.com'
            self.initialized = True
        except:
            print('failed to request getStsToken')
        
    def get_credentials(self):
        return Credentials(self.access_key_id, self.access_key_secret, self.security_token)

class OssClient:
    def __init__(self):
        self.cred_provider = CustomCredentialsProvider()
        self.bucket = None
        if self.cred_provider.initialized:
            self.bucket = oss2.Bucket(oss2.ProviderAuth(self.cred_provider), self.cred_provider.endpoint, self.cred_provider.bucket)
    
    def upload_file(self, filename):
        if self.bucket is None:
            return filename
        fn = os.path.basename(filename)
        res = self.bucket.put_object_from_file(fn, filename)
        return res.resp.response.url
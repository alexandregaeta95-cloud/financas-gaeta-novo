# Configuração Nativa no Android (Leitor de Notificações Bancárias PIX)

Para ativar a leitura de notificações do Nubank, PicPay e Itaú no seu aplicativo Android (Capacitor) em **Java**, siga estes passos simples na sua pasta local `android/`:

---

### Passo 1: Copiar os dois arquivos Java

Copie os arquivos `BankNotificationListenerService.java` e `BankNotificationPlugin.java` para o diretório de código-fonte nativo do seu projeto:

Caminho de destino exato:
`android/app/src/main/java/com/aelttecnologia/dizai/`

*(Ambos os arquivos já estão com `package com.aelttecnologia.dizai;` no topo)*

---

### Passo 2: Adicionar a tag `<service>` no `AndroidManifest.xml`

Abra o arquivo `android/app/src/main/AndroidManifest.xml` e, dentro da tag `<application>`, adicione o serviço de escuta de notificações:

```xml
        <!-- Serviço de Leitura de Notificações Bancárias PIX -->
        <service
            android:name=".BankNotificationListenerService"
            android:label="Leitor de Notificações PIX"
            android:permission="android.permission.BIND_NOTIFICATION_LISTENER_SERVICE"
            android:exported="true">
            <intent-filter>
                <action android:name="android.service.notification.NotificationListenerService" />
            </intent-filter>
        </service>
```

---

### Passo 3: Atualizar o `MainActivity.java`

Abra o arquivo `android/app/src/main/java/com/aelttecnologia/dizai/MainActivity.java` e registre o plugin no método `onCreate`:

```java
package com.aelttecnologia.dizai;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(BankNotificationPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
```

---

### Passo 4: Sincronizar e Compilar

No terminal do seu computador na raiz do projeto:
```bash
npm run build
npx cap sync
```
E compile o seu APK no Android Studio ou via terminal (`./gradlew assembleDebug`).

---

### Como conceder a permissão no celular após instalar o APK:
1. Abra o aplicativo e vá em **Configurações Gerais ➔ Leitor de Notificações PIX**.
2. Clique no botão **"Conceder Acesso nas Configurações"**.
3. O Android abrirá a tela do sistema **"Acesso a notificações"**; ative a chave ao lado de **DizAí** e confirme.
4. Pronto! Sempre que você fizer ou receber um PIX no Nubank, PicPay ou Itaú, o app detectará e abrirá o modal sugerindo o lançamento pronto para você confirmar e salvar.
